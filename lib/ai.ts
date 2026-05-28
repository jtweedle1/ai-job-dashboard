import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "./firebase-admin";
import { decrypt } from "./encryption";

async function getApiKey(uid: string): Promise<string | { error: string }> {
  let encryptedKey: string | null | undefined;
  try {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    encryptedKey = userSnap.data()?.apiKey as string | null | undefined;
  } catch (err) {
    console.error("[ai] Firestore read failed:", err);
    return { error: "firestore_error" };
  }
  if (!encryptedKey) return { error: "no_key" };
  try {
    return decrypt(encryptedKey);
  } catch {
    return { error: "decrypt_failed" };
  }
}

export async function callAI(
  uid: string,
  messages: Anthropic.MessageParam[],
  system?: string,
  maxTokens = 1024
): Promise<{ content: string } | { error: string }> {
  const keyResult = await getApiKey(uid);
  if (typeof keyResult !== "string") return keyResult;

  try {
    const client = new Anthropic({ apiKey: keyResult });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
    });
    const block = response.content[0];
    if (block.type !== "text") return { error: "unexpected_response" };
    return { content: block.text };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "api_error";
    return { error: msg };
  }
}

// Uses web search so Claude can pull current information rather than relying on training data.
// Responses contain multiple content blocks; this returns the final text block.
export async function callAIWithWebSearch(
  uid: string,
  messages: Anthropic.MessageParam[],
  system?: string,
  maxTokens = 2048
): Promise<{ content: string } | { error: string }> {
  const keyResult = await getApiKey(uid);
  if (typeof keyResult !== "string") return keyResult;

  try {
    const client = new Anthropic({ apiKey: keyResult });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
    });
    const textBlock = [...response.content].reverse().find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { error: "unexpected_response" };
    return { content: textBlock.text };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "api_error";
    console.error("[callAIWithWebSearch] API error:", msg, err);
    return { error: msg };
  }
}
