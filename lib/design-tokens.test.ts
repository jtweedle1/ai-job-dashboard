import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the Trailhead tokens straight out of globals.css, so a color tweak that breaks contrast
// fails here instead of shipping. Pairs come from DESIGN.md §2 and §12.

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = ["ink", "ink-soft", "ink-muted", "action", "sky", "moss", "stone", "caution", "danger", "sun-ink"];

describe.each([
  ["light", block(":root"), ["canvas", "sheet", "well"]],
  ["dark", block(".dark"), ["canvas", "sheet", "well", "raised"]],
] as const)("%s theme", (_, tokens, surfaces) => {
  it.each(TEXT)("%s text passes AA on every surface", (text) => {
    for (const surface of surfaces) {
      expect(contrast(tokens[text], tokens[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("control borders pass 3:1 against the surfaces they sit on", () => {
    for (const surface of ["canvas", "sheet"]) {
      expect(contrast(tokens.control, tokens[surface]), `control on ${surface}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("button text passes AA on the action color", () => {
    expect(contrast(tokens["on-action"], tokens.action)).toBeGreaterThanOrEqual(4.5);
  });
});
