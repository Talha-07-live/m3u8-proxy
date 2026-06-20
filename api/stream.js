export default async function handler(request, response) {
  // ১. গ্লোবাল CORS হেডার সেটআপ
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "*");

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  // ২. আপনার মেইন সোর্স ডোমেইন
  const targetDomain = "andro.evrenesoglu57.click";
  const targetBase = `https://${targetDomain}`;
  
  // ইউআরএল থেকে পাথ এবং কোয়েরি প্যারামিটার আলাদা করা
  const urlPath = request.url.split('?')[0];
  const urlSearch = request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : '';
  const targetUrl = `${targetBase}${urlPath}${urlSearch}`;
  const lowerPath = urlPath.toLowerCase();

  // ৩. রিকোয়েস্ট হেডার মাস্কিং ও টিউনিং
  const modifiedHeaders = {};
  for (const [key, value] of Object.entries(request.headers)) {
    modifiedHeaders[key] = value;
  }
  modifiedHeaders["host"] = targetDomain;
  modifiedHeaders["origin"] = targetBase;
  modifiedHeaders["referer"] = `${targetBase}/`;
  modifiedHeaders["connection"] = "keep-alive";
  modifiedHeaders["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

  try {
    // ৪. সোর্স সার্ভার থেকে হাই-স্পিড ডাটা ফেচিং
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: modifiedHeaders
    });

    if (!res.ok) {
      return response.status(res.status).send(`Source Error: ${res.statusText}`);
    }

    // ৫. স্মার্ট ক্যাশিং পলিসি (Strictly Vercel Edge Optimized)
    if (lowerPath.endsWith('.m3u8')) {
      response.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      response.setHeader("Cache-Control", "public, max-age=1, stale-while-revalidate=1");
    } else if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // কন্টেন্ট টাইপ পাস করে দেওয়া যাতে ব্রাউজার দ্রুত রিড করতে পারে
      if (res.headers.get("content-type")) {
        response.setHeader("Content-Type", res.headers.get("content-type"));
      }
    } else {
      response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }

    // ৬. ডাটা স্ট্রিম ডাউনস্ট্রিম করা (Memory-Safe Optimized)
    // res.body সরাসরি একটি ReadableStream, যা মেমোরি ফুল না করে হাই-স্পিডে ডাটা পাস করে
    if (res.body) {
      const reader = res.body.getReader();
      
      // ডাটা চাঙ্ক (Chunk) বাই চাঙ্ক রাইট করা
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(value);
      }
      return response.end();
    } else {
      // যদি বডি না থাকে (যেমন HEAD রিকোয়েস্ট)
      const data = await res.arrayBuffer();
      return response.status(res.status).send(Buffer.from(data));
    }

  } catch (error) {
    return response.status(502).send("Vercel Hyper-Engine Error: " + error.message);
  }
}
