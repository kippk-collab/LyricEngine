const BASE_URL = "https://api.datamuse.com/words";

interface DatamuseWord {
  word: string;
  score: number;
  numSyllables?: number;
}

export interface SyllableGroup {
  count: number;
  words: string[];
}

export interface RhymeResult {
  groups: SyllableGroup[];
  slantRhyme: boolean; // true when contraction proxy was used
}

async function query(params: Record<string, string>): Promise<DatamuseWord[]> {
  const qs = new URLSearchParams({ ...params, md: "s" }).toString();
  const res = await fetch(`${BASE_URL}?${qs}`);
  if (!res.ok) throw new Error(`Datamuse error: ${res.status}`);
  return res.json();
}

// Datamuse can't look up contractions. Map each to a vowel-matched proxy
// so rhyme results share the right sound. Keyed by full contraction where
// the vowel differs (don't vs can't), by suffix where it doesn't.
const CONTRACTION_PROXY: Record<string, string> = {
  // n't - vowel varies per word
  "don't":    "bone",   // long O
  "won't":    "bone",   // long O
  "can't":    "rant",   // short A
  "shan't":   "rant",   // short A
  "isn't":    "mint",   // short I
  "didn't":   "mint",   // short I
  "wasn't":   "hunt",   // short U
  "doesn't":  "hunt",   // short U
  "wouldn't": "hunt",   // short U
  "couldn't": "hunt",   // short U
  "shouldn't":"hunt",   // short U
  "hasn't":   "hunt",   // short U
  "hadn't":   "hunt",   // short U
  "aren't":   "hunt",   // short U (approx)
  "weren't":  "hunt",   // short U (approx)
  "mustn't":  "hunt",   // short U
  "needn't":  "mint",   // short I (approx)
  "ain't":    "rant",   // short A
  // Other contraction types - suffix is enough
  "'re":  "fear",   // we're/they're/you're → -eer
  "'ll":  "hill",   // I'll/we'll/they'll → -ill
  "'ve":  "dive",   // I've/we've/they've → -ive
  "'m":   "dim",    // I'm → -im
  "'d":   "rid",    // I'd/we'd/they'd → -id
  "'s":   "fizz",   // it's/he's/that's → -iz
};

function findContractionProxy(word: string): string | null {
  if (!word.includes("'")) return null;
  const lower = word.toLowerCase();
  // Check full-word match first (for n't contractions with varying vowels)
  if (CONTRACTION_PROXY[lower]) return CONTRACTION_PROXY[lower];
  // Fall back to suffix match
  for (const [suffix, proxy] of Object.entries(CONTRACTION_PROXY)) {
    if (suffix.startsWith("'") && lower.endsWith(suffix)) return proxy;
  }
  return null;
}

export async function fetchRhymes(word: string): Promise<RhymeResult> {
  let results = await query({ rel_rhy: word });
  let slantRhyme = false;

  // Contraction fallback: use known rhyme-proxy word
  if (results.length === 0) {
    const proxy = findContractionProxy(word);
    if (proxy) {
      results = await query({ rel_rhy: proxy });
      if (results.length > 0) slantRhyme = true;
    }
  }

  const groups: Map<number, string[]> = new Map();
  for (const item of results) {
    const count = item.numSyllables ?? 1;
    if (!groups.has(count)) groups.set(count, []);
    groups.get(count)!.push(item.word);
  }

  return {
    groups: Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([count, words]) => ({ count, words })),
    slantRhyme,
  };
}

export interface RelationWord {
  word: string;
  numSyllables?: number;
}

export async function fetchRelations(
  word: string,
  relationType: string
): Promise<RelationWord[]> {
  let results = await query({ [relationType]: word });

  // Contraction fallback: use known rhyme-proxy word
  if (results.length === 0) {
    const proxy = findContractionProxy(word);
    if (proxy) results = await query({ [relationType]: proxy });
  }

  results.sort((a, b) => (a.numSyllables ?? 1) - (b.numSyllables ?? 1));
  return results.map((r) => ({ word: r.word, numSyllables: r.numSyllables }));
}
