import { NextRequest, NextResponse } from "next/server"
import dns from "dns/promises"

export async function POST(req: NextRequest) {
	// noting the start time
	let start = Date.now()

	// checking for incoming body
	const METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"]

	let body: any
	try {
		body = await req.json()
	} catch (err) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "Invalid JSON body",
		})
	}

	// destructuring the request
	const { url, method } = body

	// URL validation
	if (!url || typeof url !== "string") {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "URL is required and must be a string",
		})
	}

	if (!/^https?:\/\//i.test(url)) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "URL must start with http:// or https://",
		})
	}

	// cchecking for complete url structure
	try {
		new URL(url)
	} catch (error) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "Invalid URL format",
		})
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

	const hostname = new URL(url).hostname


	async function isPrivateIp(hostname: string) {
		// Resolve hostname to all IPs
		let addresses
		try {
			addresses = await dns.lookup(hostname, { all: true })
		} catch {
			return true // If DNS fails, treat as unsafe
		}

		for (const addr of addresses) {
			const ip = addr.address

			// IPv4 Private Ranges
			if (
				/^127\./.test(ip) || // localhost
				/^10\./.test(ip) || // 10.x.x.x
				/^192\.168\./.test(ip) || // 192.168.x.x
				/^172\.(1[6-9]|2[0-9]|3[0-1])/.test(ip) || // 172.16-31.x.x
				/^169\.254\./.test(ip) // link-local
			) {
				return true
			}

			// IPv6 Private / localhost
			if (
				ip === "::1" || // IPv6 localhost
				/^fc00:/i.test(ip) || // Unique local IPv6
				/^fe80:/i.test(ip) // Link-local IPv6
			) {
				return true
			}
		}

		return false
	}

	if (!hostname.endsWith("jsonplaceholder.typicode.com") && await isPrivateIp(hostname)) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "Requests to private IPs (IPv4 or IPv6) are blocked",
		})
	}


	// checking for valid method entered by user
	if (!METHODS.includes(method)) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: `Method must be one of the followin ${METHODS.join(", ")}`,
		})
	}

	// input validation done

	// headers validation
	const blockedHeaders = [
		"host",
		"content-length",
		"connection",
		"accept-encoding",
	]

	const safeHeaders: Record<string, string> = {}

	const headers = body.headers || {}

	if (typeof headers !== "object" || Array.isArray(headers)) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			data: { message: "Headers must be an object" },
		})
	}

	for (const [key, value] of Object.entries(headers)) {
		if (typeof value !== "string") {
			continue
		}

		const lowerKey = key.toLowerCase()

		if (!blockedHeaders.includes(lowerKey)) {
			safeHeaders[lowerKey] = value
		}
	}

	// body validation
	let requestBody: string | undefined = undefined

	if (method !== "GET" && body.body !== undefined) {
		try {
			requestBody = JSON.stringify(body.body)

			if (!safeHeaders["content-type"]) {
				safeHeaders["content-type"] = "application/json"
			}
		} catch (err) {
			return NextResponse.json({
				success: false,
				status: 400,
				time: Date.now() - start,
				error: "Body must be valid JSON",
			})
		}
	}

	// request forwarding 
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => {
			controller.abort()
		}, 10000)

		const fetchOptions = {
			method,
			headers: safeHeaders,
			body: requestBody,
			signal: controller.signal,
		}

		const response = await fetch(finalUrl, fetchOptions)
		clearTimeout(timeout)


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
		const contentType = response.headers.get("content-type") || ""

		// If JSON, parse and return JSON safely
		if (contentType.includes("application/json")) {
			try {
				const text = await response.text()
				const data = JSON.parse(text)
				return NextResponse.json({
					success: true,
					status: response.status,
					time: Date.now() - start,
					headers: Object.fromEntries(response.headers.entries()),
					data,
				})
			} catch {
				// fallback if invalid JSON
				return new NextResponse(response.body, {
					status: response.status,
					headers: response.headers,
				})
			}
		}

		// For everything else (text, files, images, PDFs, videos, SSE) → stream raw body
		return new NextResponse(response.body, {
			status: response.status,
			headers: response.headers, // preserves content-type, content-disposition, etc.
		})



	} catch (err: any) {
		return NextResponse.json({
			success: false,
			status: err.name === "AbortError" ? 408 : 502,
			time: Date.now() - start,
			error: err.name === "AbortError" ? "Request timed out" : err.message,
		})
	}
}

