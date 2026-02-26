import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

export async function POST(req: NextRequest) {
  // noting the start time
  let start = Date.now();

  // checking for incoming body
  const METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "Invalid JSON body",
    });
  }

  // destructuring the request
  const { url, method } = body;

  // URL validation
  if (!url || typeof url !== "string") {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "URL is required and must be a string",
    });
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "URL must start with http:// or https://",
    });
  }

  // cchecking for complete url structure
  try {
    new URL(url);
  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "Invalid URL format",
    });
  }

  const baseUrl = body.url;
  let finalUrl: string;

  try {
    const urlObj = new URL(baseUrl);

    // If query object exists, append it
    if (body.query && typeof body.query === "object") {
      for (const [key, value] of Object.entries(body.query)) {
        urlObj.searchParams.set(key, String(value));
      }
    }

    finalUrl = urlObj.toString();
  } catch (err) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "Invalid URL",
    });
  }

  const hostname = new URL(url).hostname;

  async function isPrivateIp(hostname: string) {
    // Resolve hostname to all IPs
    let addresses;
    try {
      addresses = await dns.lookup(hostname, { all: true });
    } catch {
      return true; // If DNS fails, treat as unsafe
    }

    for (const addr of addresses) {
      const ip = addr.address;

      // IPv4 Private Ranges
      if (
        /^127\./.test(ip) || // localhost
        /^10\./.test(ip) || // 10.x.x.x
        /^192\.168\./.test(ip) || // 192.168.x.x
        /^172\.(1[6-9]|2[0-9]|3[0-1])/.test(ip) || // 172.16-31.x.x
        /^169\.254\./.test(ip) // link-local
      ) {
        return true;
      }

      // IPv6 Private / localhost
      if (
        ip === "::1" || // IPv6 localhost
        /^fc00:/i.test(ip) || // Unique local IPv6
        /^fe80:/i.test(ip) // Link-local IPv6
      ) {
        return true;
      }
    }

    return false;
  }

  if (
    !hostname.endsWith("jsonplaceholder.typicode.com") &&
    (await isPrivateIp(hostname))
  ) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: "Requests to private IPs (IPv4 or IPv6) are blocked",
    });
  }

  // checking for valid method entered by user
  if (!METHODS.includes(method)) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      error: `Method must be one of the followin ${METHODS.join(", ")}`,
    });
  }

  // input validation done

  // headers validation
  const blockedHeaders = [
    "host",
    "content-length",
    "connection",
    "accept-encoding",
  ];

  const safeHeaders: Record<string, string> = {};

  const headers = body.headers || {};

  if (typeof headers !== "object" || Array.isArray(headers)) {
    return NextResponse.json({
      success: false,
      status: 400,
      time: Date.now() - start,
      data: { message: "Headers must be an object" },
    });
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== "string") {
      continue;
    }

    const lowerKey = key.toLowerCase();

    if (!blockedHeaders.includes(lowerKey)) {
      safeHeaders[lowerKey] = value;
    }
  }

  // body validation
  let requestBody: string | undefined = undefined;

  if (method !== "GET" && body.body !== undefined) {
    try {
      requestBody = JSON.stringify(body.body);

      if (!safeHeaders["content-type"]) {
        safeHeaders["content-type"] = "application/json";
      }
    } catch (err) {
      return NextResponse.json({
        success: false,
        status: 400,
        time: Date.now() - start,
        error: "Body must be valid JSON",
      });
    }
  }

  // request forwarding
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    const fetchOptions = {
      method,
      headers: safeHeaders,
      body: requestBody,
      signal: controller.signal,
    };

    const response = await fetch(finalUrl, fetchOptions);
    clearTimeout(timeout);

    // this piece of code down here was buffering response all atonce

    // const text = await response.text()
    // let data

    // try {
    // 	data = JSON.parse(text) // Try parsing JSON
    // } catch {
    // 	data = text // Fallback to raw text
    // }

    // return NextResponse.json({
    // 	success: true,
    // 	status: response.status,
    // 	time: Date.now() - start,
    // 	headers: Object.fromEntries(response.headers.entries()),
    // 	data,
    // })

    // get the content  type to see if its text or binary image or file

    // Get content-type
    const contentType = response.headers.get("content-type") || "";

    // If JSON, parse and return JSON safely
    if (contentType.includes("application/json")) {
      try {
        const text = await response.text();
        const data = JSON.parse(text);
        return NextResponse.json({
          success: true,
          status: response.status,
          time: Date.now() - start,
          headers: Object.fromEntries(response.headers.entries()),
          data,
        });
      } catch {
        // fallback if invalid JSON
        return new NextResponse(response.body, {
          status: response.status,
          headers: response.headers,
        });
      }
    }

    // For everything else (text, files, images, PDFs, videos, SSE) → stream raw body
    // return new NextResponse(response.body, {
    // 	status: response.status,
    // 	headers: response.headers, // preserves content-type, content-disposition, etc.
    // })

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Access-Control-Allow-Origin": "*",
      },
    });

	
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: err.name === "AbortError" ? 408 : 502,
      time: Date.now() - start,
      error: err.name === "AbortError" ? "Request timed out" : err.message,
    });
  }
}



// import { NextRequest, NextResponse } from "next/server";
// import dns from "dns/promises";

// export const runtime = "nodejs";

// export async function POST(req: NextRequest) {
//   const start = Date.now();
//   const METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"];

//   // 1. Parse Input
//   let bodyJson: any;
//   try {
//     bodyJson = await req.json();
//   } catch (err) {
//     return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
//   }

//   const { url, method = "GET", query, headers: userHeaders, body: userData } = bodyJson;

//   // 2. Validate URL
//   if (!url || !/^https?:\/\//i.test(url)) {
//     return NextResponse.json({ success: false, error: "Valid URL required" }, { status: 400 });
//   }

//   // 3. Build Final URL
//   let finalUrl: URL;
//   try {
//     finalUrl = new URL(url);
//     if (query && typeof query === "object") {
//       Object.entries(query).forEach(([k, v]) => finalUrl.searchParams.set(k, String(v)));
//     }
//   } catch (err) {
//     return NextResponse.json({ success: false, error: "Invalid URL format" }, { status: 400 });
//   }

//   // 4. SSRF Protection
//   const hostname = finalUrl.hostname;
//   try {
//     const isPrivate = await isPrivateIp(hostname);
//     if (isPrivate && process.env.NODE_ENV === "production") {
//       return NextResponse.json({ success: false, error: "Private IPs are blocked" }, { status: 403 });
//     }
//   } catch (e) {
//     // If DNS fails here, we proceed and let fetch handle it
//   }

//   // 5. Sanitize Headers
//   const safeHeaders: Record<string, string> = {
//     // Add a default User-Agent so we don't get blocked
//     "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
//     "accept": "*/*"
//   };

//   const blockedHeaders = ["host", "connection", "content-length", "content-encoding", "transfer-encoding"];
//   if (userHeaders && typeof userHeaders === "object") {
//     Object.entries(userHeaders).forEach(([k, v]) => {
//       if (!blockedHeaders.includes(k.toLowerCase()) && typeof v === "string") {
//         safeHeaders[k.toLowerCase()] = v;
//       }
//     });
//   }

//   // 6. Execute Request
//   try {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), 15000);

//     // CRITICAL FIX: Do not include 'body' property at all for GET/HEAD requests
//     const fetchOptions: RequestInit = {
//       method: method.toUpperCase(),
//       headers: safeHeaders,
//       signal: controller.signal,
//       redirect: "follow",
//     };

//     if (fetchOptions.method !== "GET" && fetchOptions.method !== "HEAD" && userData) {
//       fetchOptions.body = typeof userData === "object" ? JSON.stringify(userData) : String(userData);
//       if (!safeHeaders["content-type"]) safeHeaders["content-type"] = "application/json";
//     }

//     const response = await fetch(finalUrl.toString(), fetchOptions);
//     clearTimeout(timeout);

//     const contentType = response.headers.get("content-type") || "";

//     // 7. Process Response
//     // If JSON: Return wrapped success response
//     if (contentType.includes("application/json")) {
//       const data = await response.json();
//       return NextResponse.json({
//         success: true,
//         status: response.status,
//         time: Date.now() - start,
//         headers: Object.fromEntries(response.headers.entries()),
//         data,
//       });
//     }

//     // If Image/File: Stream the raw data directly
//     const responseHeaders = new Headers();
//     response.headers.forEach((v, k) => {
//       if (!blockedHeaders.includes(k.toLowerCase())) responseHeaders.set(k, v);
//     });
//     responseHeaders.set("Access-Control-Allow-Origin", "*");

//     return new NextResponse(response.body, {
//       status: response.status,
//       headers: responseHeaders,
//     });

//   } catch (err: any) {
//     console.error("Proxy Error:", err); // Log this to see actual error in terminal
//     return NextResponse.json({
//       success: false,
//       status: err.name === "AbortError" ? 408 : 502,
//       time: Date.now() - start,
//       error: err.message || "Fetch failed",
//     }, { status: err.name === "AbortError" ? 408 : 502 });
//   }
// }

// async function isPrivateIp(hostname: string) {
//   if (hostname === "localhost" || hostname === "127.0.0.1") return true;
//   try {
//     const addresses = await dns.lookup(hostname, { all: true });
//     return addresses.some(addr => 
//       /^127\./.test(addr.address) || /^10\./.test(addr.address) || 
//       /^192\.168\./.test(addr.address) || /^172\.(1[6-9]|2[0-9]|3[0-1])/.test(addr.address) ||
//       addr.address === "::1" || addr.address.startsWith("fe80")
//     );
//   } catch { return false; }
// }