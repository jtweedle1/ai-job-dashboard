import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "./firebase-admin";
import { decrypt } from "./encryption";

export async function callAI(
  uid: string,
  messages: Anthropic.MessageParam[],
  system?: string,
  maxTokens = 1024
): Promise<{ content: string } | { error: string }> {
  let encryptedKey: string | null | undefined;
  try {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    encryptedKey = userSnap.data()?.apiKey as string | null | undefined;
  } catch (err) {
    console.error("[callAI] Firestore read failed:", err);
    return { error: "firestore_error" };
  }
  if (!encryptedKey) return { error: "no_key" };

  let apiKey: string;
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    return { error: "decrypt_failed" };
  }

  try {
    const client = new Anthropic({ apiKey });
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
