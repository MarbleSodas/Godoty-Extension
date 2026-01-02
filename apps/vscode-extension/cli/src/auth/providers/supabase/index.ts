import type { AuthProvider } from "../../types.js"
import { authenticateWithSupabase } from "./device-auth.js"

/**
 * Supabase authentication provider for CLI
 * Uses GitHub/Google OAuth via Supabase
 */
export const supabaseAuthProvider: AuthProvider = {
	name: "Godoty (Supabase OAuth)",
	value: "supabase",
	authenticate: authenticateWithSupabase,
}
