import * as vscode from "vscode"
import { createClient, SupabaseClient, Session, User } from "@supabase/supabase-js"

import { GODOTY_LITELLM_URL } from "../../api/providers/lite-llm"
import { Package } from "../../shared/package"

const SUPABASE_URL = "https://kbnaymejrngxhpigwphh.supabase.co"
const SUPABASE_ANON_KEY = "sb_publishable_crqwAKS-G2fVqkyOTr95lQ_SQu-vaj3"

type AuthProvider = "github" | "google"

interface GodotyAuthState {
	user: User | null
	session: Session | null
	apiKey: string | null
}

export class GodotyAuthService implements vscode.Disposable {
	private supabase: SupabaseClient
	private context: vscode.ExtensionContext
	private outputChannel: vscode.OutputChannel
	private disposables: vscode.Disposable[] = []

	private _onAuthStateChange = new vscode.EventEmitter<GodotyAuthState>()
	readonly onAuthStateChange = this._onAuthStateChange.event

	private currentState: GodotyAuthState = {
		user: null,
		session: null,
		apiKey: null,
	}

	constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
		this.context = context
		this.outputChannel = outputChannel

		this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: true,
				persistSession: true,
				detectSessionInUrl: false,
				storage: {
					getItem: async (key) => {
						const value = await this.context.secrets.get(`godoty-auth-${key}`)
						return value ?? null
					},
					setItem: async (key, value) => {
						await this.context.secrets.store(`godoty-auth-${key}`, value)
					},
					removeItem: async (key) => {
						await this.context.secrets.delete(`godoty-auth-${key}`)
					},
				},
			},
		})

		this.supabase.auth.onAuthStateChange(async (event, session) => {
			this.log(`Auth state changed: ${event}`)
			this.currentState.session = session
			this.currentState.user = session?.user ?? null

			if (session) {
				await this.syncApiKey()
			} else {
				this.currentState.apiKey = null
				await this.clearProviderSettings()
			}

			this._onAuthStateChange.fire({ ...this.currentState })
		})

		this.disposables.push(this._onAuthStateChange)
	}

	async initialize(): Promise<void> {
		this.log("Initializing Godoty auth service")

		try {
			const {
				data: { session },
			} = await this.supabase.auth.getSession()
			if (session) {
				this.currentState.session = session
				this.currentState.user = session.user
				await this.syncApiKey()
				this.log(`Restored session for ${session.user.email}`)
			}
		} catch (error) {
			this.log(`Failed to restore session: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async signIn(): Promise<void> {
		const choices: vscode.QuickPickItem[] = [
			{ label: "$(github) Sign in with GitHub", description: "github" },
			{ label: "$(globe) Sign in with Google", description: "google" },
		]

		const choice = await vscode.window.showQuickPick(choices, {
			placeHolder: "Choose sign-in method",
			title: "Sign in to Godoty",
		})

		if (!choice) return

		const provider = choice.description as AuthProvider
		await this.signInWithOAuth(provider)
	}

	private async signInWithOAuth(provider: AuthProvider): Promise<void> {
		this.log(`Starting OAuth flow with ${provider}`)

		const { data, error } = await this.supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo: `vscode://${Package.publisher}.${Package.name}/auth/callback`,
				skipBrowserRedirect: true,
			},
		})

		if (error) {
			vscode.window.showErrorMessage(`Sign in failed: ${error.message}`)
			this.log(`OAuth error: ${error.message}`)
			return
		}

		if (data.url) {
			await vscode.env.openExternal(vscode.Uri.parse(data.url))
			vscode.window.showInformationMessage("Complete sign-in in your browser, then return here.")
		}
	}

	async handleOAuthCallback(uri: vscode.Uri): Promise<void> {
		this.log(`Handling OAuth callback: ${uri.toString().substring(0, 100)}...`)

		try {
			const fragment = uri.fragment
			const params = new URLSearchParams(fragment)
			const accessToken = params.get("access_token")
			const refreshToken = params.get("refresh_token")

			if (!accessToken) {
				const errorDescription = params.get("error_description")
				throw new Error(errorDescription || "No access token in callback")
			}

			const { data, error } = await this.supabase.auth.setSession({
				access_token: accessToken,
				refresh_token: refreshToken || "",
			})

			if (error) throw error

			await this.syncApiKey()

			const displayName = data.user?.user_metadata?.full_name || data.user?.email || "User"
			vscode.window.showInformationMessage(`Welcome to Godoty, ${displayName}!`)
			this.log(`Successfully signed in as ${data.user?.email}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error"
			vscode.window.showErrorMessage(`Authentication failed: ${message}`)
			this.log(`OAuth callback error: ${message}`)
		}
	}

	async signOut(): Promise<void> {
		this.log("Signing out")

		try {
			await this.supabase.auth.signOut()
			await this.clearProviderSettings()
			vscode.window.showInformationMessage("Signed out of Godoty")
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error"
			vscode.window.showErrorMessage(`Sign out failed: ${message}`)
			this.log(`Sign out error: ${message}`)
		}
	}

	getUser(): User | null {
		return this.currentState.user
	}

	getSession(): Session | null {
		return this.currentState.session
	}

	getApiKey(): string | null {
		return this.currentState.apiKey
	}

	isAuthenticated(): boolean {
		return this.currentState.user !== null && this.currentState.apiKey !== null
	}

	private async syncApiKey(): Promise<void> {
		if (!this.currentState.user) {
			this.currentState.apiKey = null
			return
		}

		try {
			const { data, error } = await this.supabase
				.from("user_api_keys")
				.select("litellm_key")
				.eq("user_id", this.currentState.user.id)
				.single()

			if (error) {
				this.log(`Failed to fetch API key: ${error.message}`)
				this.currentState.apiKey = null
				return
			}

			this.currentState.apiKey = data?.litellm_key ?? null

			if (this.currentState.apiKey) {
				await this.updateProviderSettings({
					litellmBaseUrl: GODOTY_LITELLM_URL,
					godotyApiKey: this.currentState.apiKey,
					godotyUserId: this.currentState.user.id,
				})
				this.log("API key synced to provider settings")
			}
		} catch (error) {
			this.log(`Error syncing API key: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	private async updateProviderSettings(settings: Record<string, string>): Promise<void> {
		const config = vscode.workspace.getConfiguration(Package.name)
		const currentSettings = config.get<Record<string, unknown>>("providerSettings", {})
		await config.update(
			"providerSettings",
			{
				...currentSettings,
				...settings,
			},
			vscode.ConfigurationTarget.Global,
		)
	}

	private async clearProviderSettings(): Promise<void> {
		const config = vscode.workspace.getConfiguration(Package.name)
		const currentSettings = config.get<Record<string, unknown>>("providerSettings", {})
		delete currentSettings.godotyApiKey
		delete currentSettings.godotyUserId
		await config.update("providerSettings", currentSettings, vscode.ConfigurationTarget.Global)
	}

	private log(message: string): void {
		this.outputChannel.appendLine(`[GodotyAuth] ${message}`)
	}

	dispose(): void {
		this.disposables.forEach((d) => d.dispose())
	}
}
