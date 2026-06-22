export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 🔒 লোকালহোস্ট এবং যেকোনো ডিরেক্ট লিঙ্কের জন্য সেফ সাইড রিকোয়েস্ট পাসিং
  const requestReferer = request.headers.get("referer") || "";
  
  const targetDomain = "andro.evrenesoglu57.click";
  const fastlyDomain = "babaylazoryarisirlar1806.global.ssl.fastly.net";
  
  const url = new URL(request.url);
  let cleanPath = url.pathname;
  
  if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.replace(/^\/api/, '');
  }

  const lowerPath = cleanPath.toLowerCase();
  const isM3u8 = lowerPath.endsWith('.m3u8');
  const isSegment = lowerPath.endsWith('.ts') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg');
  
  if (!isM3u8 && !isSegment) {
    return new Response("Unauthorized Request Pattern", { status: 403, headers: corsHeaders });
  }

  let isFastlySegment = cleanPath.includes('androstreamlivetb_');
  let targetUrl = isFastlySegment 
    ? `https://${fastlyDomain}${cleanPath}${url.search}`
    : `https://${targetDomain}${cleanPath}${url.search}`;

  const modifiedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!['host', 'origin', 'referer', 'accept-encoding'].includes(key.toLowerCase())) {
      modifiedHeaders.set(key, value);
    }
  }
  
  const currentHost = isFastlySegment ? fastlyDomain : targetDomain;
  modifiedHeaders.set("host", currentHost);
  modifiedHeaders.set("origin", `https://${currentHost}`);
  modifiedHeaders.set("referer", `https://${currentHost}/`);
  modifiedHeaders.set("connection", "keep-alive");
  modifiedHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: modifiedHeaders
    });

    if (!res.ok) {
      return new Response(`Source Error: ${res.statusText}`, { status: res.status, headers: corsHeaders });
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
      return new Response("File size exceeds Vercel 50MB Edge Limit", { status: 500, headers: corsHeaders });
    }

    const responseHeaders = new Headers(corsHeaders);
    if (res.headers.get("content-type")) {
      responseHeaders.set("Content-Type", res.headers.get("content-type"));
    }

    if (isM3u8) {
      responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
      
      let playlistText = await res.text();
      const proxyBaseUrl = `https://${url.host}/api`;
      const regex = new RegExp(`https://${fastlyDomain}`, 'g');
      playlistText = playlistText.replace(regex, proxyBaseUrl);
      
      return new Response(playlistText, { status: 200, headers: responseHeaders });
    } 
    
    if (isSegment) {
      responseHeaders.set("Cache-Control", "public, max-age=10, s-maxage=259200, stale-while-revalidate=60");
      return new Response(res.body, { status: res.status, headers: responseHeaders });
    }

    return new Response(res.body, { status: res.status, headers: responseHeaders });

  } catch (error) {
    return new Response("Vercel Edge Hyper-Drive Error: " + error.message, { status: 502, headers: corsHeaders });
  }
}
