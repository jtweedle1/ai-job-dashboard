import { NextResponse } from "next/server";

function isPrivateHost(hostname: string): boolean {
  // Strip IPv6 brackets: [::1] → ::1
  const host = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

  // Reject localhost by name
  if (host === "localhost") return true;

  // IPv4 private/link-local/loopback ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const [, a, b] = match.map(Number);
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
    if (a === 192 && b === 168) return true;            // 192.168.0.0/16
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16 (link-local)
    if (a === 127) return true;                         // 127.0.0.0/8 (loopback)
    if (a === 0) return true;                           // 0.0.0.0
  }

  // IPv6 loopback
  if (host === "::1") return true;

  // IPv6 ULA (fc00::/7 covers fc00:: through fdff::)
  const lc = host.toLowerCase();
  if (lc.startsWith("fc") || lc.startsWith("fd")) return true;

  // IPv6 link-local (fe80::/10)
  if (lc.startsWith("fe8") || lc.startsWith("fe9") || lc.startsWith("fea") || lc.startsWith("feb")) return true;

  // IPv4-mapped IPv6 (::ffff:10.x.x.x, ::ffff:192.168.x.x, etc.)
  if (lc.startsWith("::ffff:")) {
    const mapped = lc.slice(7); // extract the IPv4 portion
    const m4 = mapped.match(/^(\d{1,3})\.(\d{1,3})/);
    if (m4) {
      const a = Number(m4[1]);
      const b = Number(m4[2]);
      if (a === 10) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a === 127) return true;
      if (a === 0) return true;
    }
  }

  return false;
}

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

  // Validate URL scheme
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ success: false, reason: "invalid_url" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ success: false, reason: "https_required" }, { status: 400 });
  }

  // Block SSRF: reject private, link-local, and loopback IP addresses
  const hostname = parsedUrl.hostname;
  if (isPrivateHost(hostname)) {
    return NextResponse.json({ success: false, reason: "ssrf_blocked" }, { status: 400 });
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
