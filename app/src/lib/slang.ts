const UD_API_URL = "https://api.urbandictionary.com/v0/define";

export interface SlangEntry {
  definition: string;
  thumbsUp: number;
}

function cleanUdText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]/g, '$1')  // strip [bracket] link markup
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchSlang(word: string): Promise<SlangEntry[]> {
  const params = new URLSearchParams({ term: word });
  const res = await fetch(`${UD_API_URL}?${params}`, {
    headers: { "User-Agent": "LyricEngine/1.0" },
  });
  if (!res.ok) throw new Error(`Urban Dictionary API error: ${res.status}`);

  const data = await res.json();
  if (!data?.list || !Array.isArray(data.list)) return [];

  // UD pre-sorts by internal relevance score; vote counts are not reliably exposed in the public API.
  // Take the first N entries and filter by definition quality only.
  const seen = new Set<string>();
  return data.list
    .map((r: Record<string, unknown>) => ({
      definition: cleanUdText(String(r.definition ?? '')),
      thumbsUp: 0,
    }))
    .filter((e: SlangEntry) => e.definition.length >= 15)  // skip trivially short entries
    .slice(0, 10)
    .filter((e: SlangEntry) => {
      const key = e.definition.slice(0, 120).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
