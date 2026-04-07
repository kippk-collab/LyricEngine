const PHRASES_API_URL = "https://www.stands4.com/services/v2/phrases.php";

export interface PhraseResult {
  phrase: string;
  explanation: string;
}

export async function fetchPhrases(word: string): Promise<string[]> {
  const uid = process.env.PHRASES_API_UID;
  const token = process.env.PHRASES_API_TOKEN;

  if (!uid || !token) {
    throw new Error("PHRASES_API_UID and PHRASES_API_TOKEN must be set in .env.local");
  }

  const params = new URLSearchParams({
    uid,
    tokenid: token,
    phrase: word,
    format: "json",
  });

  const res = await fetch(`${PHRASES_API_URL}?${params}`, {
    headers: { "User-Agent": "LyricEngine/1.0" },
  });
  if (!res.ok) throw new Error(`Phrases API error: ${res.status}`);

  const data = await res.json();

  // API returns { result: [ { phrase, explanation }, ... ] } or empty
  if (!data?.result || !Array.isArray(data.result)) return [];

  const lowerWord = word.toLowerCase();
  const seen = new Set<string>();
  return data.result
    .map((r: { term?: string }) => r.term)
    .filter((p: string | undefined): p is string => {
      if (!p || !p.toLowerCase().includes(lowerWord)) return false;
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
