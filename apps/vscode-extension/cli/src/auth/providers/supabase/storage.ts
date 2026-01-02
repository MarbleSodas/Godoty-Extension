import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import type { Session } from "@supabase/supabase-js"

/**
 * CLI session storage for Supabase authentication
 * Stores session data in the CLI config directory
 */

const STORAGE_DIR = path.join(os.homedir(), ".godoty")
const SESSION_FILE = path.join(STORAGE_DIR, "supabase-session.json")

/**
 * Ensure the storage directory exists
 */
function ensureStorageDir(): void {
	if (!fs.existsSync(STORAGE_DIR)) {
		fs.mkdirSync(STORAGE_DIR, { mode: 0o700, recursive: true })
	}
}

/**
 * Save session data to disk
 * @param session - Supabase session to save
 */
export function saveSession(session: Session): void {
	ensureStorageDir()
	const data = {
		access_token: session.access_token,
		refresh_token: session.refresh_token,
		expires_at: session.expires_at,
		user: session.user,
	}
	fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), { mode: 0o600 })
}

/**
 * Load session data from disk
 * @returns Session data or null if not found
 */
export function loadSession(): {
	access_token: string
	refresh_token: string
	expires_at?: number
	user: unknown
} | null {
	try {
		if (!fs.existsSync(SESSION_FILE)) {
			return null
		}
		const data = fs.readFileSync(SESSION_FILE, "utf-8")
		return JSON.parse(data)
	} catch {
		return null
	}
}

/**
 * Remove session data from disk
 */
export function clearSession(): void {
	try {
		if (fs.existsSync(SESSION_FILE)) {
			fs.unlinkSync(SESSION_FILE)
		}
	} catch {
		// Ignore errors
	}
}
