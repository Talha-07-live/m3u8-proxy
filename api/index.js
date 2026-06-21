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

  // ১. আপনার মেইন সোর্স এবং সিডিএন ডোমেইন সেটিংস
  const targetDomain = "andro.evrenesoglu57.click";
  const fastlyDomain = "babaylazoryarisirlar1806.global.ssl.fastly.net";
  
  const url = new URL(request.url);
  let cleanPath = url.pathname;
  
  if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.replace(/^\/api/, '');
  }

  // ২. রিকোয়েস্ট কোন ডোমেইনে পাঠাতে হবে তা নির্ধারণ করা
  // যদি পাথের ভেতর ফাস্টলি সিডিএন এর ফাইল খোঁজা হয়, তবে ফাস্টলি সার্ভারে রিকোয়েস্ট যাবে
  let isFastlySegment = cleanPath.includes('androstreamlivetb_');
  let targetUrl = isFastlySegment 
    ? `https://${fastlyDomain}${cleanPath}${url.search}`
    : `https://${targetDomain}${cleanPath}${url.search}`;

  const lowerPath = cleanPath.toLowerCase();

  // ৩. হেডার মাস্কিং
  const modifiedHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
      modifiedHeaders.set(key, value);
    }
  }
  
  // সোর্স ডোমেইন অনুযায়ী সঠিক হোস্ট সেট করা
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

    const responseHeaders = new Headers(corsHeaders);
    if (res.headers.get("content-type")) {
      responseHeaders.set("Content-Type", res.headers.get("content-type"));
    }

    // ৪. ক্যাশ কন্ট্রোল ও প্লেলিস্ট মডিফিকেশন ম্যাজিক
    if (lowerPath.endsWith('.m3u8')) {
      responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      responseHeaders.set("Cache-Control", "public, max-age=1, stale-while-revalidate=2");
      
      // .m3u8 ফাইলের ভেতরের টেক্সট রিড করা
      let playlistText = await res.text();
      
      // 🎯 আসল ট্রিক: প্লেলিস্টের ভেতরের Fastly লিঙ্কগুলোকে কেটে Vercel প্রক্সি লিঙ্ক দিয়ে রিপ্লেস করা
      const proxyBaseUrl = `https://${url.host}/api`;
      const regex = new RegExp(`https://${fastlyDomain}`, 'g');
      playlistText = playlistText.replace(regex, proxyBaseUrl);
      
      return new Response(playlistText, { status: 200, headers: responseHeaders });
    } 
    
    // ৫. ভিডিও ইমেজ সেগমেন্ট (.jpg) ৩ দিনের জন্য ক্যাশ করা
    if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
      responseHeaders.set("Cache-Control", "public, max-age=259200, stale-while-revalidate=60");
      return new Response(res.body, { status: res.status, headers: responseHeaders });
    }

    return new Response(res.body, { status: res.status, headers: responseHeaders });

  } catch (error) {
    return new Response("Vercel Edge Rewriter Error: " + error.message, { status: 502, headers: corsHeaders });
  }
}
