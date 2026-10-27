// Pure checks run on every generated letter before the user sends it. No Firebase, safe on client and server.

import { findBannedPhrases } from "@/lib/banned-phrases";
import type { LetterClaim } from "@/types/coverLetter";

// Phrases that read as AI-generated. Any the user writes themselves are allowed back in.
export const AI_CLICHES = [
  "I am writing to express my interest",
  "I am excited to apply",
  "I believe my skills align",
  "My background has equipped me",
  "I would be a valuable asset",
  "Thank you for your time and consideration",
  "I am confident that",
  "dynamic team",
  "fast-paced environment",
  "passionate about leveraging",
];

export interface QualityCheck {
  id: "banned" | "cliches" | "placeholders" | "length" | "openings" | "claims";
  label: string;
  ok: boolean;
  detail: string;
}

export interface QualityOptions {
  bannedPhrases: string[];
  // null = no target set, so length is reported but never fails.
  targetWords: number | null;
  // null = sources not checked yet, so the check is left out.
  claims: LetterClaim[] | null;
}

const PLACEHOLDER = /\[[^\]\n]{1,40}\]|\{\{[^}\n]*\}\}|\bX{2,}\b|\bTBD\b/g;
const LENGTH_TOLERANCE = 0.15;
const MAX_I_OPENINGS = 0.4;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 3);
}

function quoted(items: string[]): string {
  return items.map((i) => `"${i}"`).join(", ");
}

export function letterQualityChecks(content: string, opts: QualityOptions): QualityCheck[] {
  const checks: QualityCheck[] = [];

  const banned = findBannedPhrases(content, opts.bannedPhrases);
  checks.push({
    id: "banned",
    label: "Your banned words",
    ok: banned.length === 0,
    detail: banned.length ? `Still uses ${quoted(banned)}` : opts.bannedPhrases.length ? "None used" : "No banned list set",
  });

  const cliches = findBannedPhrases(content, AI_CLICHES);
  checks.push({
    id: "cliches",
    label: "AI clichés",
    ok: cliches.length === 0,
    detail: cliches.length ? `Found ${quoted(cliches)}` : "None found",
  });

  const placeholders = [...new Set(content.match(PLACEHOLDER) ?? [])];
  checks.push({
    id: "placeholders",
    label: "Placeholders",
    ok: placeholders.length === 0,
    detail: placeholders.length ? `Fill in ${placeholders.join(", ")}` : "None left",
  });

  const words = countWords(content);
  const target = opts.targetWords;
  const inRange = target === null || Math.abs(words - target) <= target * LENGTH_TOLERANCE;
  checks.push({
    id: "length",
    label: "Length",
    ok: inRange,
    detail: target === null ? `${words} words` : `${words} words (aiming for about ${target})`,
  });

  const all = sentences(content);
  const iStarts = all.filter((s) => /^I\b/.test(s)).length;
  const share = all.length ? iStarts / all.length : 0;
  checks.push({
    id: "openings",
    label: "Varied sentence openings",
    ok: share <= MAX_I_OPENINGS,
    detail: `${iStarts} of ${all.length} sentences start with "I"`,
  });

  if (opts.claims) {
    const unbacked = opts.claims.filter((c) => !c.source).length;
    checks.push({
      id: "claims",
      label: "Claims backed by your material",
      ok: unbacked === 0,
      detail:
        opts.claims.length === 0
          ? "No claims about you found"
          : unbacked
          ? `${unbacked} of ${opts.claims.length} not found in your resume or background`
          : `All ${opts.claims.length} traced to your resume or background`,
    });
  }

  return checks;
}
