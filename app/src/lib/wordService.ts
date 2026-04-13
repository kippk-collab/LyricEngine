import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchRhymes as apiRhymes,
  fetchRelations as apiRelations,
  type SyllableGroup,
  type RhymeResult,
} from './datamuse'
import { fetchPhrases as apiPhrases, decodeHtmlEntities } from './phrases'
import { logger } from './logger'

export type { SyllableGroup, RhymeResult }

// ─── Usage metering ───────────────────────────────────────────────────────────

function parseTierLimit(envVal: string | undefined): number | null {
  if (!envVal || envVal.trim() === '') return null  // empty = unlimited
  const n = parseInt(envVal, 10)
  return isNaN(n) ? null : n
}

const TIER_LIMITS: Record<string, number | null> = {
  free: parseTierLimit(process.env.TIER_LIMIT_FREE) ?? 20,
  basic: parseTierLimit(process.env.TIER_LIMIT_BASIC) ?? 100,
  pro: parseTierLimit(process.env.TIER_LIMIT_PRO),
}

export class UsageLimitError extends Error {
  constructor(
    public readonly tier: string,
    public readonly used: number,
    public readonly limit: number
  ) {
    super(`Monthly API limit reached (${used}/${limit} on ${tier} tier)`)
    this.name = 'UsageLimitError'
  }
}

interface UsageStatus {
  allowed: boolean
  tier: string
  used: number
  limit: number | null
}

async function checkUsageLimit(supabase: SupabaseClient, userId: string): Promise<UsageStatus> {
  const { data, error } = await supabase
    .from('users')
    .select('tier, api_uses_this_month')
    .eq('id', userId)
    .single()

  if (error || !data) {
    logger.warn('checkUsageLimit: user not found, treating as free', { userId })
    return { allowed: true, tier: 'free', used: 0, limit: TIER_LIMITS.free }
  }

  const limit = data.tier in TIER_LIMITS ? TIER_LIMITS[data.tier] : TIER_LIMITS.free
  const used = data.api_uses_this_month ?? 0
  const allowed = limit === null || used < limit

  return { allowed, tier: data.tier, used, limit }
}

// Not atomic — acceptable for MVP single-user dev. TODO(WS7): replace with a Postgres RPC for atomic increment.
async function incrementUsage(supabase: SupabaseClient, userId: string, currentCount: number): Promise<void> {
  await supabase
    .from('users')
    .update({ api_uses_this_month: currentCount + 1 })
    .eq('id', userId)
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function ensureWord(supabase: SupabaseClient, word: string): Promise<number> {
  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .eq('word', word)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('words')
    .insert({ word })
    .select('id')
    .single()

  if (error) throw new Error(`ensureWord failed: ${error.message}`)
  return data.id
}

async function isCached(supabase: SupabaseClient, wordId: number, relationType: string): Promise<boolean> {
  const { data } = await supabase
    .from('word_fetch_log')
    .select('id')
    .eq('word_id', wordId)
    .eq('relation_type', relationType)
    .single()
  return !!data
}

async function getCachedRelations(
  supabase: SupabaseClient,
  wordId: number,
  relationType: string
): Promise<Array<{ word: string; numSyllables: number | null }>> {
  const { data } = await supabase
    .from('word_relations')
    .select('related_word, related_num_syllables')
    .eq('word_id', wordId)
    .eq('relation_type', relationType)
  return (data ?? []).map((r) => ({
    word: r.related_word,
    numSyllables: r.related_num_syllables,
  }))
}

async function writeToCache(
  supabase: SupabaseClient,
  wordId: number,
  relationType: string,
  words: Array<{ word: string; numSyllables?: number | null }>
): Promise<void> {
  if (words.length > 0) {
    await supabase.from('word_relations').insert(
      words.map((w) => ({
        word_id: wordId,
        related_word: w.word,
        relation_type: relationType,
        related_num_syllables: w.numSyllables ?? null,
      }))
    )
  }
  // Always log the fetch — even empty results, so we don't re-fetch next time.
  await supabase
    .from('word_fetch_log')
    .insert({ word_id: wordId, relation_type: relationType })
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
    .insert({ user_id: userId, action_type: actionType, word, source })
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getRhymes(
  supabase: SupabaseClient,
  word: string,
  userId: string
): Promise<RhymeResult> {
  const wordId = await ensureWord(supabase, word)
  const relationType = 'rel_rhy'
  const slantRhyme = word.includes("'")

  if (await isCached(supabase, wordId, relationType)) {
    const cached = await getCachedRelations(supabase, wordId, relationType)
    // Don't trust empty cache for contractions - the phonetic fallback may not have existed yet
    if (cached.length > 0 || !slantRhyme) {
      logger.info('cache hit', { word, relationType })
      logActivity(supabase, userId, 'search', word, 'cache')

      const groups = new Map<number, string[]>()
      for (const r of cached) {
        const count = r.numSyllables ?? 1
        if (!groups.has(count)) groups.set(count, [])
        groups.get(count)!.push(r.word)
      }
      return {
        groups: Array.from(groups.entries())
          .sort(([a], [b]) => a - b)
          .map(([count, words]) => ({ count, words })),
        slantRhyme: slantRhyme && cached.length > 0,
      }
    }
    logger.info('empty cache for contraction, re-fetching', { word, relationType })
  }

  // Not cached - check usage limit before hitting the API
  const usage = await checkUsageLimit(supabase, userId)
  if (!usage.allowed) {
    logger.warn('usage limit reached', { userId, tier: usage.tier, used: usage.used, limit: usage.limit })
    throw new UsageLimitError(usage.tier, usage.used, usage.limit!)
  }

  logger.info('api call', { word, relationType })
  const result = await apiRhymes(word)
  const flat = result.groups.flatMap((g) => g.words.map((w) => ({ word: w, numSyllables: g.count })))
  logger.debug('api response', { word, relationType, resultCount: flat.length })
  writeToCache(supabase, wordId, relationType, flat)
  incrementUsage(supabase, userId, usage.used)
  logActivity(supabase, userId, 'search', word, 'api')

  return result
}

export async function getRelations(
  supabase: SupabaseClient,
  word: string,
  relationType: string,
  userId: string
): Promise<string[]> {
  const wordId = await ensureWord(supabase, word)

  if (await isCached(supabase, wordId, relationType)) {
    const cached = await getCachedRelations(supabase, wordId, relationType)
    // Don't trust empty cache for contractions — the phonetic fallback may not have existed yet
    if (cached.length > 0 || !word.includes("'")) {
      logger.info('cache hit', { word, relationType })
      logActivity(supabase, userId, `fetch_${relationType}`, word, 'cache')
      // Deduplicate and sort by syllable count
      const seen = new Set<string>()
      let results = cached
        .sort((a, b) => (a.numSyllables ?? 1) - (b.numSyllables ?? 1))
        .filter((r) => { if (seen.has(r.word)) return false; seen.add(r.word); return true })
        .map((r) => r.word)
      if (relationType === 'phrases') {
        results = results.map(decodeHtmlEntities)
        const wb = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        results = results.filter((p) => wb.test(p) && !/^Appendix:/i.test(p))
      }
      return results
    }
    logger.info('empty cache for contraction, re-fetching', { word, relationType })
  }

  // Not cached — check usage limit before hitting the API
  const usage = await checkUsageLimit(supabase, userId)
  if (!usage.allowed) {
    logger.warn('usage limit reached', { userId, tier: usage.tier, used: usage.used, limit: usage.limit })
    throw new UsageLimitError(usage.tier, usage.used, usage.limit!)
  }

  logger.info('api call', { word, relationType })
  let words: string[]
  if (relationType === 'phrases') {
    const raw = await apiPhrases(word)
    words = [...new Set(raw)]
    writeToCache(supabase, wordId, relationType, words.map((w) => ({ word: w })))
  } else {
    const raw = await apiRelations(word, relationType)
    const deduped = raw.filter((r, i, arr) => arr.findIndex((x) => x.word === r.word) === i)
    writeToCache(supabase, wordId, relationType, deduped.map((w) => ({ word: w.word, numSyllables: w.numSyllables })))
    words = deduped.map((r) => r.word)
  }
  logger.debug('api response', { word, relationType, resultCount: words.length })
  incrementUsage(supabase, userId, usage.used)
  logActivity(supabase, userId, `fetch_${relationType}`, word, 'api')

  return words
}
