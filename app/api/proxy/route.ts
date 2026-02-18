import { NextRequest, NextResponse } from "next/server"

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

	const hostname = new URL(url).hostname
	if (
		/^127\.0\.0\.1/.test(hostname) ||
		/^localhost/.test(hostname) ||
		/^10\./.test(hostname) ||
		/^192\.168\./.test(hostname) ||
		/^172\.(1[6-9]|2[0-9]|3[0-1])/.test(hostname)
	) {
		return NextResponse.json({
			success: false,
			status: 400,
			time: Date.now() - start,
			error: "Requests to private IPs are blocked",
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

		const response = await fetch(url, fetchOptions)
		clearTimeout(timeout)

		const text = await response.text()
		let data

		try {
			data = JSON.parse(text) // Try parsing JSON
		} catch {
			data = text // Fallback to raw text
		}

		return NextResponse.json({
			success: true,
			status: response.status,
			time: Date.now() - start,
			headers: Object.fromEntries(response.headers.entries()),
			data,
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
