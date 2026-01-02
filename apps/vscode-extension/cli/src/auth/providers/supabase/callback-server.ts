import * as http from "node:http"
import type { AddressInfo } from "node:net"

/**
 * OAuth callback server for CLI authentication
 * Listens for the Supabase OAuth callback and extracts the session tokens
 */

const CALLBACK_PORT = 53682
const CALLBACK_PATH = "/callback"

/**
 * Result from the OAuth callback
 */
export interface CallbackResult {
	success: boolean
	accessToken?: string
	refreshToken?: string
	error?: string
}

/**
 * Start a local HTTP server to receive the OAuth callback
 * @returns Promise that resolves with the callback result
 */
export function startCallbackServer(): Promise<CallbackResult> {
	return new Promise((resolve) => {
		const server = http.createServer((req, res) => {
			if (req.url?.startsWith(CALLBACK_PATH)) {
				// Parse the URL hash for OAuth tokens
				const hashParams = new URLSearchParams(req.url.split("#")[1] || "")
				const accessToken = hashParams.get("access_token")
				const refreshToken = hashParams.get("refresh_token")
				const error = hashParams.get("error_description") || hashParams.get("error")

				// Send HTML response to user
				res.writeHead(200, { "Content-Type": "text/html" })
				res.end(`
					<!DOCTYPE html>
					<html>
					<head>
						<title>Authentication Complete</title>
						<style>
							body {
								font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
								display: flex;
								justify-content: center;
								align-items: center;
								height: 100vh;
								margin: 0;
								background: #1a1a1a;
								color: #fff;
							}
							.container {
								text-align: center;
								padding: 40px;
								background: #2a2a2a;
								border-radius: 12px;
								box-shadow: 0 4px 20px rgba(0,0,0,0.3);
							}
							.success { color: #4ade80; }
							.error { color: #f87171; }
							h1 { margin: 0 0 16px 0; }
							p { margin: 0; opacity: 0.9; }
						</style>
					</head>
					<body>
						<div class="container">
							${error
								? `<h1 class="error">Authentication Failed</h1><p>${error}</p><p>You can close this window and try again.</p>`
								: `<h1 class="success">Authentication Successful!</h1><p>You can close this window and return to the terminal.</p>`
							}
						</div>
					</body>
					</html>
				`)

				// Resolve the promise with the result
				server.close(() => {
					if (error) {
						resolve({ success: false, error })
					} else if (accessToken) {
						resolve({ success: true, accessToken, refreshToken: refreshToken || undefined })
					} else {
						resolve({ success: false, error: "No access token received" })
					}
				})
			} else {
				// 404 for other paths
				res.writeHead(404)
				res.end("Not found")
			}
		})

		server.listen(CALLBACK_PORT, () => {
			const port = (server.address() as AddressInfo).port
			console.log(`Callback server listening on port ${port}`)
		})

		// Timeout after 5 minutes
		setTimeout(() => {
			server.close(() => {
				resolve({ success: false, error: "Authentication timed out" })
			})
		}, 5 * 60 * 1000)
	})
}
