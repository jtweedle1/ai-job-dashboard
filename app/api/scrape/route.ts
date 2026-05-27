import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid_request" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return NextResponse.json({ success: false, reason: "no_url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ success: false, reason: "blocked" });
    }
    if (!res.ok) {
      return NextResponse.json({ success: false, reason: "fetch_failed" });
    }

    const html = await res.text();

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 100) {
      return NextResponse.json({ success: false, reason: "js_rendered" });
    }

    return NextResponse.json({ success: true, text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("timeout") || msg.includes("abort") || msg.includes("AbortError")) {
      return NextResponse.json({ success: false, reason: "timeout" });
    }
    return NextResponse.json({ success: false, reason: "fetch_failed" });
  }
}
