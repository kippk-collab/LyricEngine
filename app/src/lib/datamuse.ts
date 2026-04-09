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

async function query(params: Record<string, string>): Promise<DatamuseWord[]> {
  const qs = new URLSearchParams({ ...params, md: "s" }).toString();
  const res = await fetch(`${BASE_URL}?${qs}`);
  if (!res.ok) throw new Error(`Datamuse error: ${res.status}`);
  return res.json();
}

export async function fetchRhymes(word: string): Promise<SyllableGroup[]> {
  const results = await query({ rel_rhy: word });

  const groups: Map<number, string[]> = new Map();
  for (const item of results) {
    const count = item.numSyllables ?? 1;
    if (!groups.has(count)) groups.set(count, []);
    groups.get(count)!.push(item.word);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([count, words]) => ({ count, words }));
}

export interface RelationWord {
  word: string;
  numSyllables?: number;
}

export async function fetchRelations(
  word: string,
  relationType: string
): Promise<RelationWord[]> {
  const results = await query({ [relationType]: word });
  results.sort((a, b) => (a.numSyllables ?? 1) - (b.numSyllables ?? 1));
  return results.map((r) => ({ word: r.word, numSyllables: r.numSyllables }));
}
