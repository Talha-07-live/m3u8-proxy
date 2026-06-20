export default async function handler(request, response) {
  // ১. গ্লোবাল CORS হেডার সেটআপ (যাতে প্লেয়ার ব্লক না খায়)
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "*");

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  // ২. আপনার মেইন সোর্স ডোমেইন
  const targetDomain = "andro.evrenesoglu57.click";
  const targetBase = `https://${targetDomain}`;
  
  // ইউআরএল থেকে পাথ এবং কোয়েরি প্যারামিটার আলাদা করা
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
      // লাইভ প্লেলিস্টের জন্য ১ সেকেন্ড ক্যাশ + ব্যাকগ্রাউন্ড রিভ্যালিডেশন
      response.setHeader("Cache-Control", "public, max-age=1, stale-while-revalidate=1");
    } else if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
      // ভিডিও সেগমেন্ট ও ইমেজ চিরদিনের জন্য Vercel Edge-এ ক্যাশ থাকবে (ব্যান্ডউইথ বাঁচাবে)
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }

    // ৬. ডাটা স্ট্রিম ডাউনস্ট্রিম করা
    const data = await res.arrayBuffer();
    return response.status(res.status).send(Buffer.from(data));

  } catch (error) {
    return response.status(502).send("Vercel Hyper-Engine Error: " + error.message);
  }
}
