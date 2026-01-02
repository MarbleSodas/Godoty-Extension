import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { AuthResult } from "../../types.js"
import { openBrowser } from "../../utils/browser.js"
import { startCallbackServer } from "./callback-server.js"
import { saveSession } from "./storage.js"

const SUPABASE_URL = "https://kbnaymejrngxhpigwphh.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3"
const CALLBACK_PORT = 53682

/**
 * Execute the Supabase OAuth flow for CLI authentication
 * @returns Authentication result with provider config
 * @throws Error if authentication fails
 */
export async function authenticateWithSupabase(): Promise<AuthResult> {
	console.log("\n🔐 Starting Supabase authentication for Godoty...\n")

	// Step 1: Create Supabase client
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: true,
			persistSession: false,
		},
	})

	// Step 2: Prompt for OAuth provider selection
	console.log("Choose an OAuth provider:")
	console.log("  1. GitHub")
	console.log("  2. Google")

	const providerChoice = await promptChoice("Enter your choice (1 or 2)", ["1", "2"])
	const provider = providerChoice === "1" ? "github" : "google"

	// Step 3: Generate OAuth URL with redirect to localhost
	const redirectUrl = `http://localhost:${CALLBACK_PORT}/callback`

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider,
		options: {
			redirectTo: redirectUrl,
			skipBrowserRedirect: true,
		},
	})

	if (error || !data.url) {
		throw new Error(`Failed to generate OAuth URL: ${error?.message || "Unknown error"}`)
	}

	// Step 4: Start callback server and open browser
	console.log("\nOpening browser for authentication...")
	console.log(`If the browser doesn't open automatically, visit: ${data.url}`)

	const callbackServerPromise = startCallbackServer()

	const browserOpened = await openBrowser(data.url)
	if (!browserOpened) {
		console.log("\n⚠️  Could not open browser automatically. Please open the URL manually.")
	}

	console.log("\nWaiting for authentication to complete...")

	// Step 5: Wait for callback
	const callbackResult = await callbackServerPromise

	if (!callbackResult.success) {
		throw new Error(`Authentication failed: ${callbackResult.error || "Unknown error"}`)
	}

	// Step 6: Set the session in Supabase client
	const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
		access_token: callbackResult.accessToken!,
		refresh_token: callbackResult.refreshToken || "",
	})

	if (sessionError || !sessionData.session) {
		throw new Error(`Failed to create session: ${sessionError?.message || "Unknown error"}`)
	}

	const session = sessionData.session
	const user = session.user

	console.log(`\n✓ Authenticated as ${user?.email || "unknown"}\n`)

	// Step 7: Save session to disk
	saveSession(session)

	// Step 8: Get user ID for LiteLLM
	const userId = user?.id
	if (!userId) {
		throw new Error("Failed to get user ID from session")
	}

	// Step 9: Return provider config with LiteLLM settings
	return {
		providerConfig: {
			id: "default",
			provider: "litellm",
			litellmBaseUrl: "https://litellm-production-150c.up.railway.app",
			litellmModelId: "claude-3-7-sonnet-20250219",
			// These will be used by the LiteLLM handler to authenticate
			godotyUserId: userId,
			godotyApiKey: callbackResult.accessToken,
		},
	}
}

/**
 * Prompt user for a choice from valid options
 * @param prompt - The prompt message
 * @param validOptions - Array of valid choices
 * @returns The user's choice
 */
async function promptChoice(prompt: string, validOptions: string[]): Promise<string> {
	const readline = await import("node:readline")
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise((resolve) => {
		rl.question(`${prompt}: `, (answer) => {
			rl.close()
			const trimmed = answer.trim()
			if (validOptions.includes(trimmed)) {
				resolve(trimmed)
			} else {
				console.log(`Invalid choice. Please try again.`)
				// Recursively prompt again
				promptChoice(prompt, validOptions).then(resolve)
			}
		})
	})
}
