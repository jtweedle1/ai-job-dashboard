// Pure: no Firebase, safe anywhere.
// Turns any other failed AI call into something the person can act on, instead of a bare "try again".
// The server's own limit answers 429; Anthropic's errors arrive as their message text.
export function aiErrorMessage(status: number, error: string | undefined, fallback: string): string {
  const e = error ?? "";
  if (status === 429 || e === "rate_limited" || /\b429\b|rate.?limit/i.test(e))
    return "That's a lot of AI requests in one minute. Wait a minute, then try again.";
  if (e === "decrypt_failed" || /\b401\b|invalid x-api-key|authentication/i.test(e))
    return "Anthropic didn't accept your key. Check it in Settings.";
  if (/credit balance/i.test(e)) return "Your Anthropic account is out of credit. Top it up, then try again.";
  return fallback;
}
