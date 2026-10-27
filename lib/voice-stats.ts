// Pure text measurements of a user's writing samples. No Firebase, safe on client and server.
// The numbers ground the voice profile so the model can't invent habits (e.g. "no contractions").

export interface VoiceStats {
  sampleCount: number;
  medianWords: number;
  medianParagraphs: number;
  avgSentenceWords: number;
  contractionsPer100Words: number;
  exclamationsPerSample: number;
  greetings: string[];
  signOffs: string[];
}

const CONTRACTION = /\b\w+['’](s|re|ve|ll|d|m|t)\b/gi;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Blank lines separate paragraphs. Text without any (often pasted) falls back to single newlines.
function paragraphs(text: string): string[] {
  const splitter = /\n\s*\n/.test(text) ? /\n\s*\n/ : /\n/;
  return text
    .split(splitter)
    .map((p) => p.trim())
    .filter(Boolean);
}

function greetingOf(text: string): string | null {
  const first = paragraphs(text)[0] ?? "";
  return /^(dear|hi|hello|hey|to whom|greetings)\b/i.test(first) && words(first) <= 10 ? first : null;
}

// A sign-off is a short closing line ("Best," / "Thanks,") near the end, usually followed by a name.
// Read line by line so "Thanks,\nRiley" counts, and skip the first paragraph so a greeting never does.
function signOffOf(text: string): string | null {
  const tail = paragraphs(text)
    .slice(1)
    .flatMap((p) => p.split("\n"))
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-3);
  return tail.find((l) => /,$/.test(l) && words(l) <= 4) ?? null;
}

export function computeVoiceStats(texts: string[]): VoiceStats {
  const clean = texts.map((t) => t.trim()).filter(Boolean);
  const wordCounts = clean.map(words);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);
  const sentences = clean.flatMap((t) => t.split(/(?<=[.!?])\s+/).filter((s) => words(s) > 2));
  const contractions = clean.reduce((n, t) => n + (t.match(CONTRACTION)?.length ?? 0), 0);
  const exclamations = clean.reduce((n, t) => n + (t.match(/!/g)?.length ?? 0), 0);

  return {
    sampleCount: clean.length,
    medianWords: median(wordCounts),
    // Body paragraphs only: greeting, sign-off and name lines are short.
    medianParagraphs: median(clean.map((t) => paragraphs(t).filter((p) => words(p) > 6).length)),
    avgSentenceWords: sentences.length
      ? Math.round(sentences.reduce((n, s) => n + words(s), 0) / sentences.length)
      : 0,
    contractionsPer100Words: totalWords ? Math.round((contractions / totalWords) * 1000) / 10 : 0,
    exclamationsPerSample: clean.length ? Math.round((exclamations / clean.length) * 10) / 10 : 0,
    greetings: clean.map(greetingOf).filter((g): g is string => Boolean(g)),
    signOffs: clean.map(signOffOf).filter((s): s is string => Boolean(s)),
  };
}

export function describeVoiceStats(s: VoiceStats): string {
  const lines = [
    `Samples measured: ${s.sampleCount}`,
    `Typical length: about ${s.medianWords} words in ${s.medianParagraphs} body paragraphs`,
    `Average sentence: ${s.avgSentenceWords} words`,
    `Contractions: ${s.contractionsPer100Words} per 100 words (${
      s.contractionsPer100Words >= 1 ? "uses contractions" : "rarely uses contractions"
    })`,
    `Exclamation points: ${s.exclamationsPerSample} per sample`,
  ];
  if (s.greetings.length) lines.push(`Greetings used: ${s.greetings.map((g) => `"${g}"`).join(", ")}`);
  if (s.signOffs.length) lines.push(`Sign-offs used: ${s.signOffs.map((g) => `"${g}"`).join(", ")}`);
  return lines.join("\n");
}
