const PHRASES_API_URL = "https://www.stands4.com/services/v2/phrases.php";

export interface PhraseResult {
  phrase: string;
  explanation: string;
}

// Decode HTML entities (&#039; -> ', &amp; -> &, etc.)
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Basic English filter: reject phrases with non-ASCII chars or Latin-heavy patterns
// TODO: make language configurable (pass lang param, use different heuristics per language)
function looksEnglish(phrase: string): boolean {
  // Non-ASCII catches Spanish (ñ, é, í), German (ä, ü, ö, ß), etc.
  if (/[^\x00-\x7F]/.test(phrase)) return false;
  // Wiki/reference junk
  if (/^Appendix:/i.test(phrase)) return false;
  // Latin patterns: parenthetical citations like (Brut. 79), (Ter. Ad. 4. 5. 75), Acc. c. Inf.
  if (/\([A-Z][a-z]+\.\s*\d/.test(phrase)) return false;
  // Latin phrases with common endings/words
  if (/\b(alicui|aliquem|aliquo|praestare|constare|esse|proficisci|gestare|manere|permanere|perseverare|perstare|prospicere|consulere|obstare|adversari)\b/i.test(phrase)) return false;
  return true;
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

  const wordPattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const seen = new Set<string>();
  return data.result
    .map((r: { term?: string }) => r.term ? decodeHtmlEntities(r.term) : undefined)
    .filter((p: string | undefined): p is string => {
      if (!p || !wordPattern.test(p) || !looksEnglish(p)) return false;
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
