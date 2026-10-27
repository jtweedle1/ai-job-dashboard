// Pure helpers for tracing a letter's claims back to the candidate's own material.
// No Firebase, safe on client and server. The model proposes claims and sources;
// this code only keeps what it can find word for word, so a made-up quote never shows as backed.

import type { LetterClaim } from "@/types/coverLetter";

export interface ClaimSource {
  id: string;
  label: string;
  text: string;
}

export interface ClaimSourceInput {
  resume: string;
  backgrounds: { heading: string; answers: { label: string; text: string }[] }[];
  alwaysMention?: string;
  notes?: string;
}

// Numbered so the model can cite them by a short id.
export function buildClaimSources(input: ClaimSourceInput): ClaimSource[] {
  const sources: { label: string; text: string }[] = [];
  if (input.resume.trim()) sources.push({ label: "Your resume", text: input.resume });
  for (const b of input.backgrounds)
    for (const a of b.answers)
      if (a.text.trim()) sources.push({ label: `${b.heading} · ${a.label}`, text: a.text });
  if (input.alwaysMention?.trim())
    sources.push({ label: "Things to weave in (My Voice)", text: input.alwaysMention });
  if (input.notes?.trim()) sources.push({ label: "Your notes for this letter", text: input.notes });
  return sources.map((s, i) => ({ id: `S${i + 1}`, ...s }));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Tolerates case, curly vs straight quotes, dash style, and line breaks, nothing more.
function looseRegExp(needle: string): RegExp | null {
  const trimmed = needle.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  if (!trimmed) return null;
  const pattern = trimmed
    .split(/\s+/)
    .map((word) =>
      escapeRegExp(word)
        .replace(/['’‘]/g, "['’‘]")
        .replace(/["“”]/g, '["“”]')
        .replace(/[-–—]/g, "[-–—]")
    )
    .join("\\s+");
  return new RegExp(pattern, "i");
}

export function findLoose(haystack: string, needle: string): { index: number; length: number } | null {
  const re = looseRegExp(needle);
  if (!re) return null;
  const m = re.exec(haystack);
  return m ? { index: m.index, length: m[0].length } : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Turns the model's raw claim list into claims the code has checked.
// A claim counts as backed only if its evidence is found word for word in the source it cites.
export function verifyClaims(letter: string, raw: unknown, sources: ClaimSource[]): LetterClaim[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(sources.map((s) => [s.id.toUpperCase(), s]));
  const seen = new Set<string>();
  const out: LetterClaim[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const quoteRaw = str(r.quote);
    if (!quoteRaw) continue;
    const at = findLoose(letter, quoteRaw);
    if (!at) continue;
    const quote = letter.slice(at.index, at.index + at.length);
    const key = quote.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const source = byId.get((str(r.source) ?? "").toUpperCase());
    const evidenceRaw = str(r.evidence);
    const found = source && evidenceRaw ? findLoose(source.text, evidenceRaw) : null;
    out.push(
      source && found
        ? { quote, source: source.label, evidence: source.text.slice(found.index, found.index + found.length) }
        : { quote, source: null, evidence: null }
    );
  }
  return out;
}

export interface ClaimSegment {
  text: string;
  claim: LetterClaim | null;
}

// Splits text into plain runs and claim runs, in order, for highlighting. Overlapping claims keep the first.
export function claimSegments(text: string, claims: LetterClaim[]): ClaimSegment[] {
  const spans: { start: number; end: number; claim: LetterClaim }[] = [];
  for (const claim of claims) {
    const at = findLoose(text, claim.quote);
    if (!at) continue;
    const start = at.index;
    const end = at.index + at.length;
    if (spans.some((s) => start < s.end && end > s.start)) continue;
    spans.push({ start, end, claim });
  }
  spans.sort((a, b) => a.start - b.start);

  const segments: ClaimSegment[] = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) segments.push({ text: text.slice(pos, s.start), claim: null });
    segments.push({ text: text.slice(s.start, s.end), claim: s.claim });
    pos = s.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), claim: null });
  return segments;
}

// Reads claims back from Firestore; anything malformed means "not checked".
export function toLetterClaims(d: unknown): LetterClaim[] | null {
  if (!Array.isArray(d)) return null;
  return d
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object" && typeof c.quote === "string")
    .map((c) => ({
      quote: c.quote as string,
      source: typeof c.source === "string" ? c.source : null,
      evidence: typeof c.evidence === "string" ? c.evidence : null,
    }));
}
