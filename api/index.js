export const config = {
  runtime: 'edge',
};

// গ্লোবাল কনস্ট্যান্টস (মেমোরি সেভিং ও আল্ট্রা-ফাস্ট CPU এক্সিকিউশনের জন্য)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
  "Access-Control-Max-Age": "86400"
};

const FASTLY_REGEX = /https:\/\/babaylazoryarisirlar1806\.global\.ssl\.fastly\.net/g;
const PRIMARY_TARGET = "andro.evrenesoglu57.click";
const FASTLY_DOMAIN = "babaylazoryarisirlar1806.global.ssl.fastly.net";

// 🚀 সোর্স ব্লকিং এড়াতে প্রিমিয়াম রোটেটিং ইউজার এজেন্ট পুল
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36"
];

// সিকিউর পাথ ফিল্টার (হ্যাকিং রিকোয়েস্ট ব্লক করার জন্য)
const ALLOWED_EXTENSIONS = ['.m3u8', '.ts', '.jpg', '.jpeg', '.png'];

export default async function handler(request) {
  // ১. প্রি-ফ্লাইট OPTIONS রিকোয়েস্ট ১ মিলি-সেকেন্ডে রিটার্ন
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  let cleanPath = url.pathname;
  
  if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.slice(4);
  }

  const lowerPath = cleanPath.toLowerCase();
  
  // এক্সটেনশন ভ্যালিডেশন চেক (Security Guard)
  const isValidExtension = ALLOWED_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
  if (!isValidExtension) {
    return new Response("Forbidden: Invalid Request Pattern", { status: 403, headers: CORS_HEADERS });
  }

  const isM3u8 = lowerPath.endsWith('.m3u8');
  const isFastlySegment = cleanPath.includes('androstreamlivetb_');
  
  // ডাইনামিক হোস্ট সিলেকশন
  const currentHost = isFastlySegment ? FASTLY_DOMAIN : PRIMARY_TARGET;
  const targetUrl = `https://${currentHost}${cleanPath}${url.search}`;

  // ২. হাইপার-অপ্টিমাইজড হেডার বিল্ডিং (অনাবশ্যক হেডার ফিল্টারিং)
  const modifiedHeaders = new Headers();
  modifiedHeaders.set("host", currentHost);
  modifiedHeaders.set("origin", `https://${currentHost}`);
  modifiedHeaders.set("referer", `https://${currentHost}/`);
  modifiedHeaders.set("connection", "keep-alive");
  
  // র্যান্ডম ইউজার এজেন্ট সিলেকশন
  const randomAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  modifiedHeaders.set("user-agent", randomAgent);

  // ভিডিও সিকিং এবং বাফারিং স্মুথ করার জন্য রেঞ্জ হেডার পাসিং
  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    modifiedHeaders.set("range", rangeHeader);
  }

  // ৩. রাশ আওয়ার ফেইলওভার ও ট্রিপল-রিট্রাই ইঞ্জিন (Triple-Retry Engine)
  let response = null;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // সোর্স সার্ভার ৪ সেকেন্ডে রেসপন্স না করলে রিকোয়েস্ট ড্রপ করবে

      response = await fetch(targetUrl, {
        method: request.method,
        headers: modifiedHeaders,
        keepalive: true,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // যদি রেসপন্স কোড ২০০ বা ২৬ (Partial Content) হয়, তবে সফল
      if (response.ok || response.status === 206) break;

    } catch (err) {
      // নেটওয়ার্ক টাইমআউট বা সোর্স ডাউন হলে এখানে ক্যাচ করবে
    }

    retryCount++;
    if (retryCount < maxRetries) {
      // প্রতিবার ট্রাই করার মাঝে ২৫০ মিলি-সেকেন্ডের একটি বুদ্ধিদীপ্ত ওয়েটিং টাইম (Exponential Backoff)
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  // ৪. সোর্স যদি সম্পূর্ণ ক্র্যাশ করে বা রেট-লিমিট খায়
  if (!response) {
    return new Response("Source Network Congestion", { status: 504, headers: CORS_HEADERS });
  }

  // ৫. ক্লায়েন্ট রেসপন্স হেডার প্রিপারেশন
  const responseHeaders = new Headers(CORS_HEADERS);
  
  const contentType = response.headers.get("content-type");
  if (contentType) responseHeaders.set("Content-Type", contentType);
  
  const contentRange = response.headers.get("content-range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  // 🎯 লজিক এ: প্লেলিস্ট (.m3u8) প্রসেসিং
  if (isM3u8) {
    responseHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
    responseHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    
    // হাই-স্পিড টেক্সট স্ট্রিমিং রিপ্লেসমেন্ট
    const playlistText = (await response.text()).replace(FASTLY_REGEX, `https://${url.host}/api`);
    return new Response(playlistText, { status: response.status, headers: responseHeaders });
  } 
  
  // 🎯 লজিক বি: ভিডিও ও ইমেজ সেগমেন্ট (.ts / .jpg) - রাশ আওয়ার প্রুফ লং-টার্ম ক্যাশ
  // s-maxage=604800 এর মানে ফাইলটি Vercel-এর এজ সার্ভারে ৭ দিন লক থাকবে। 
  // ট্রাফিক যত বেশিই হোক, Vercel সোর্স সার্ভারে কোনো রিকোয়েস্টই পাঠাবে না, নিজের মেমোরি থেকে ১ মিলি-সেকেন্ডে ডেলিভারি দেবে।
  responseHeaders.set(
    "Cache-Control", 
    "public, max-age=30, s-maxage=604800, stale-while-revalidate=1200"
  );
  
  // জিরো-মেমোরি পাইপলাইন স্ট্রিমিং (Zero-Copy Data Transfer)
  return new Response(response.body, { 
    status: response.status, 
    headers: responseHeaders 
  });
}
