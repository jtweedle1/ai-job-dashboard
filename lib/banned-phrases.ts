// Pure helpers for the user's "words to avoid" list. No Firebase, safe on client and server.
// The prompt alone can't enforce a long ban list, so letters are checked in code after generation.

const MAX_PHRASE_WORDS = 10;
const BAN_PREFIX = /\b(never|avoid|ban|banned|don'?t|do not|no)\b/i;

function cleanPhrase(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’.;!?]+$/g, "")
    .trim();
}

// Accepts free-form text: comma lists, one phrase per line, and headings ("Overused words:").
// Bullet lines ("* Never open with...") are rules for the model, not phrases, so they're skipped.
export function parseBannedPhrases(text: string): string[] {
  const phrases = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || /^[*•\-–]\s/.test(line)) continue;
    if (line.endsWith(":")) continue;

    const colon = line.indexOf(":");
    if (colon > 0) {
      // "Never use: a, b, c" is a list; "Overall style: specific, concise" is guidance.
      if (!BAN_PREFIX.test(line.slice(0, colon))) continue;
      line = line.slice(colon + 1);
    }

    // Any long piece means the line is a sentence of guidance, not a phrase list.
    const parts = line.split(/[,;]/).map(cleanPhrase).filter(Boolean);
    if (parts.some((p) => p.split(/\s+/).length > MAX_PHRASE_WORDS)) continue;
    for (const p of parts) phrases.add(p);
  }
  return [...phrases];
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word, case-insensitive matches, so "robust" doesn't flag "robustness" and "realm" doesn't flag "realms of".
export function findBannedPhrases(text: string, phrases: string[]): string[] {
  const haystack = normalize(text);
  return phrases.filter((p) => {
    const pattern = escapeRegExp(normalize(p)).replace(/\s+/g, "\\s+");
    return new RegExp(`(^|[^\\w])${pattern}(?=$|[^\\w])`).test(haystack);
  });
}
