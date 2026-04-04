import { supabase } from './supabase'
import {
  fetchRhymes as apiRhymes,
  fetchRelations as apiRelations,
  type SyllableGroup,
} from './datamuse'
import { logger } from './logger'

export type { SyllableGroup }

const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID!

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function ensureWord(word: string): Promise<number> {
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

async function isCached(wordId: number, relationType: string): Promise<boolean> {
  const { data } = await supabase
    .from('word_fetch_log')
    .select('id')
    .eq('word_id', wordId)
    .eq('relation_type', relationType)
    .single()
  return !!data
}

async function getCachedRelations(
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
  word: string,
  userId: string = DEV_USER_ID
): Promise<SyllableGroup[]> {
  const wordId = await ensureWord(word)
  const relationType = 'rel_rhy'

  if (await isCached(wordId, relationType)) {
    logger.info('cache hit', { word, relationType })
    const cached = await getCachedRelations(wordId, relationType)
    logActivity(userId, 'search', word, 'cache')

    const groups = new Map<number, string[]>()
    for (const r of cached) {
      const count = r.numSyllables ?? 1
      if (!groups.has(count)) groups.set(count, [])
      groups.get(count)!.push(r.word)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([count, words]) => ({ count, words }))
  }

  // Not cached — hit the API
  logger.info('api call', { word, relationType })
  const groups = await apiRhymes(word)
  const flat = groups.flatMap((g) => g.words.map((w) => ({ word: w, numSyllables: g.count })))
  logger.debug('api response', { word, relationType, resultCount: flat.length })
  writeToCache(wordId, relationType, flat)
  logActivity(userId, 'search', word, 'api')

  return groups
}

export async function getRelations(
  word: string,
  relationType: string,
  userId: string = DEV_USER_ID
): Promise<string[]> {
  const wordId = await ensureWord(word)

  if (await isCached(wordId, relationType)) {
    logger.info('cache hit', { word, relationType })
    const cached = await getCachedRelations(wordId, relationType)
    logActivity(userId, `fetch_${relationType}`, word, 'cache')
    return cached.map((r) => r.word)
  }

  // Not cached — hit the API
  logger.info('api call', { word, relationType })
  const words = await apiRelations(word, relationType)
  logger.debug('api response', { word, relationType, resultCount: words.length })
  writeToCache(wordId, relationType, words.map((w) => ({ word: w })))
  logActivity(userId, `fetch_${relationType}`, word, 'api')

  return words
}
