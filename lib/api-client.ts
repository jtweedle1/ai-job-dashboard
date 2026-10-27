import { auth } from "@/lib/firebase";

// Usage: replace fetch("/api/...") with authedFetch("/api/...") in client components.
// Attaches a fresh Firebase ID token as Authorization: Bearer header on every request.
export async function authedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!auth.currentUser) {
    throw new Error("authedFetch called without authenticated user");
  }
  const idToken = await auth.currentUser.getIdToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  // FormData bodies need the browser to set the multipart boundary itself.
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}
