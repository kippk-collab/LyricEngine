import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient, HAIKU_MODEL, LLM_MAX_TOKENS } from './anthropic';
import { logger } from './logger';
import { checkUsageLimit, incrementUsage, UsageLimitError } from './wordService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeightedTail {
  tail: string;
  weight: number;
}

export interface LeadTailsGroup {
  lead: string;
  tails: WeightedTail[];
}

export interface GroupedRelationsResult {
  groups: LeadTailsGroup[];
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

interface PromptSpec {
  system: string;
  user: (word: string) => string;
}

const JSON_SHAPE_HINT =
  '{"groups":[{"lead":"<prefix>","tails":[{"text":"phrase 1","weight":0.92},{"text":"phrase 2","weight":0.74}]}]}';

const WEIGHT_RUBRIC = [
  'Each tail object MUST include a numeric "weight" between 0.0 and 1.0 representing how strong/usable the image is — 1.0 = a sharp, specific, surprising image you would put in a song; 0.5 = a serviceable but generic line; 0.1 = stock cliché included only for coverage.',
  'Spread the weights — do NOT cluster them all near 1.0. A typical response should have a handful in the 0.85–0.99 range, the bulk in 0.4–0.8, and the rest below 0.4.',
  'Sort tails within each group by weight descending (best first).',
].join(' ');

const PROMPTS: Record<string, PromptSpec> = {
  sim: {
    system: [
      'You produce similes for songwriters, playwrights, and poets.',
      `Return ONLY a JSON object shaped exactly: ${JSON_SHAPE_HINT}.`,
      'Group similes by their natural prefix (e.g. "<word> like", "<word> that", "<word> as").',
      'Each "lead" ends where the varying phrase begins (no trailing space, no trailing punctuation).',
      'Return AT LEAST 50 total tails across all groups, ideally 60-80. Do not stop early.',
      'Prefer more over fewer. Write until you genuinely cannot produce another distinct, usable simile.',
      'Mix coverage with quality: include stock imagery a writer might want to pick AND sharper, specific, concrete images.',
      WEIGHT_RUBRIC,
      'Avoid near-duplicates within your own response.',
      'Do NOT repeat the lead inside tail text.',
      'Return ONLY the JSON object. No commentary. No markdown fences.',
    ].join(' '),
    user: (word) => `Similes for the word "${word}".`,
  },
  met: {
    system: [
      'You produce metaphors for songwriters, playwrights, and poets.',
      `Return ONLY a JSON object shaped exactly: ${JSON_SHAPE_HINT}.`,
      'Group metaphors by their natural prefix (e.g. "<word> was", "<word> is", "the <word>").',
      'Each "lead" ends where the varying phrase begins (no trailing space, no trailing punctuation).',
      'Return AT LEAST 50 total tails across all groups, ideally 60-80. Do not stop early.',
      'Prefer more over fewer. Write until you genuinely cannot produce another distinct, usable metaphor.',
      'Mix coverage with quality: include stock imagery a writer might want to pick AND sharper, specific, concrete images.',
      WEIGHT_RUBRIC,
      'Avoid near-duplicates within your own response.',
      'Do NOT repeat the lead inside tail text.',
      'Return ONLY the JSON object. No commentary. No markdown fences.',
    ].join(' '),
    user: (word) => `Metaphors for the word "${word}".`,
  },
};

export const LLM_RELATION_TYPES = Object.keys(PROMPTS);

// ─── Cache helpers (LLM-specific grouped shape) ───────────────────────────────

async function ensureWord(supabase: SupabaseClient, word: string): Promise<number> {
  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('word', word)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from('words')
    .insert({ word })
    .select('id')
    .single();
  if (error) throw new Error(`ensureWord failed: ${error.message}`);
  return data.id;
}

async function isCached(supabase: SupabaseClient, wordId: number, relationType: string): Promise<boolean> {
  const { data } = await supabase
    .from('word_fetch_log')
    .select('id')
    .eq('word_id', wordId)
    .eq('relation_type', relationType)
    .single();
  return !!data;
}

async function getCachedGroups(
  supabase: SupabaseClient,
  wordId: number,
  relationType: string
): Promise<GroupedRelationsResult> {
  const { data } = await supabase
    .from('word_relations')
    .select('lead, tail, weight, id')
    .eq('word_id', wordId)
    .eq('relation_type', relationType)
    .order('id', { ascending: true });

  const rows = data ?? [];
  const groupMap = new Map<string, WeightedTail[]>();
  for (const r of rows) {
    if (!r.lead || !r.tail) continue;
    if (!groupMap.has(r.lead)) groupMap.set(r.lead, []);
    groupMap.get(r.lead)!.push({ tail: r.tail, weight: r.weight ?? 0 });
  }
  // Sort tails within each group by weight desc so the popup's "top N" picks are stable.
  for (const tails of groupMap.values()) tails.sort((a, b) => b.weight - a.weight);
  return { groups: Array.from(groupMap.entries()).map(([lead, tails]) => ({ lead, tails })) };
}

async function writeGroupsToCache(
  supabase: SupabaseClient,
  wordId: number,
  relationType: string,
  source: string,
  groups: LeadTailsGroup[]
): Promise<void> {
  const rows = groups.flatMap((g) =>
    g.tails.map((t) => ({
      word_id: wordId,
      related_word: `${g.lead} ${t.tail}`,
      relation_type: relationType,
      source,
      lead: g.lead,
      tail: t.tail,
      weight: t.weight,
    }))
  );
  if (rows.length > 0) {
    await supabase.from('word_relations').insert(rows);
  }
  await supabase.from('word_fetch_log').insert({ word_id: wordId, relation_type: relationType });
}

async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  word: string,
  source: 'api' | 'cache'
): Promise<void> {
  await supabase
    .from('user_activity')
    .insert({ user_id: userId, action_type: actionType, word, source });
}

// ─── LLM call ─────────────────────────────────────────────────────────────────

async function callHaiku(relationType: string, word: string): Promise<GroupedRelationsResult> {
  const spec = PROMPTS[relationType];
  if (!spec) throw new Error(`no LLM prompt registered for relation type: ${relationType}`);
  const client = getAnthropicClient();
  const resp = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: LLM_MAX_TOKENS,
    system: spec.system,
    messages: [{ role: 'user', content: spec.user(word) }],
  });
  const textBlock = resp.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic response had no text block');
  }
  const raw = textBlock.text.trim();
  // Strip optional ```json fences just in case the model ignores the instruction
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Anthropic returned non-JSON: ${raw.slice(0, 200)}`);
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { groups?: unknown }).groups)) {
    throw new Error(`Anthropic response missing .groups array: ${raw.slice(0, 200)}`);
  }
  const groups: LeadTailsGroup[] = [];
  for (const g of (parsed as { groups: unknown[] }).groups) {
    if (!g || typeof g !== 'object') continue;
    const lead = (g as { lead?: unknown }).lead;
    const rawTails = (g as { tails?: unknown }).tails;
    if (typeof lead !== 'string' || !Array.isArray(rawTails)) continue;
    const cleanTails: WeightedTail[] = [];
    for (const t of rawTails) {
      if (typeof t === 'string') {
        // Tolerate the model dropping the object wrapper — treat string tails as unweighted (0).
        const text = t.trim();
        if (text.length > 0) cleanTails.push({ tail: text, weight: 0 });
        continue;
      }
      if (!t || typeof t !== 'object') continue;
      const text = (t as { text?: unknown }).text ?? (t as { tail?: unknown }).tail;
      const weight = (t as { weight?: unknown }).weight;
      if (typeof text !== 'string' || text.trim().length === 0) continue;
      const w = typeof weight === 'number' && Number.isFinite(weight)
        ? Math.max(0, Math.min(1, weight))
        : 0;
      cleanTails.push({ tail: text.trim(), weight: w });
    }
    if (cleanTails.length === 0) continue;
    cleanTails.sort((a, b) => b.weight - a.weight);
    groups.push({ lead: lead.trim(), tails: cleanTails });
  }
  return { groups };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getLlmGroupedRelations(
  supabase: SupabaseClient,
  word: string,
  relationType: string,
  userId: string
): Promise<GroupedRelationsResult> {
  if (!(relationType in PROMPTS)) {
    throw new Error(`Unsupported LLM relation type: ${relationType}`);
  }
  const wordId = await ensureWord(supabase, word);

  if (await isCached(supabase, wordId, relationType)) {
    logger.info('llm cache hit', { word, relationType });
    logActivity(supabase, userId, `fetch_${relationType}`, word, 'cache');
    return getCachedGroups(supabase, wordId, relationType);
  }

  const usage = await checkUsageLimit(supabase, userId);
  if (!usage.allowed) {
    logger.warn('usage limit reached (llm)', { userId, tier: usage.tier, used: usage.used, limit: usage.limit });
    throw new UsageLimitError(usage.tier, usage.used, usage.limit!);
  }

  logger.info('llm api call', { word, relationType, model: HAIKU_MODEL });
  const result = await callHaiku(relationType, word);
  logger.debug('llm api response', {
    word,
    relationType,
    groupCount: result.groups.length,
    tailCount: result.groups.reduce((n, g) => n + g.tails.length, 0),
  });
  writeGroupsToCache(supabase, wordId, relationType, 'llm_haiku', result.groups);
  incrementUsage(supabase, userId, usage.used);
  logActivity(supabase, userId, `fetch_${relationType}`, word, 'api');

  return result;
}
