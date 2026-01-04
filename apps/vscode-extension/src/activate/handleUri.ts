import * as vscode from "vscode"

import { CloudService } from "@roo-code/cloud"

import { ClineProvider } from "../core/webview/ClineProvider"
// godoty_change start
import { GodotyAuthRegistry } from "../services/godoty"
// godoty_change end

export const handleUri = async (uri: vscode.Uri) => {
	const path = uri.path
	const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
	const visibleProvider = ClineProvider.getVisibleInstance()

	console.log(`[handleUri] *** URI HANDLER TRIGGERED ***`)
	console.log(`[handleUri] Full URI: ${uri.toString()}`)
	console.log(`[handleUri] Scheme: "${uri.scheme}", Authority: "${uri.authority}", Path: "${path}"`)
	console.log(`[handleUri] Fragment length: ${uri.fragment?.length || 0}`)

	// godoty_change start
	if (path === "/auth/callback") {
		const auth = GodotyAuthRegistry.get()
		console.log(`[handleUri] Auth callback - registry has instance: ${!!auth}`)
		if (auth) {
			await auth.handleOAuthCallback(uri)
		} else {
			console.error("[handleUri] GodotyAuthRegistry.get() returned undefined!")
		}
		return
	}
	// godoty_change end

	if (!visibleProvider) {
		return
	}

	switch (path) {
		// kilocode_change start
		case "/glama": {
			const code = query.get("code")
			if (code) {
				await visibleProvider.handleGlamaCallback(code)
			}
			break
		}
		// kilocode_change end
		case "/openrouter": {
			const code = query.get("code")
			if (code) {
				await visibleProvider.handleOpenRouterCallback(code)
			}
			break
		}
		case "/kilocode": {
			const token = query.get("token")
			if (token) {
				await visibleProvider.handleKiloCodeCallback(token)
			}
			break
		}
		// kilocode_change start
		case "/kilocode/profile": {
			await visibleProvider.postMessageToWebview({
				type: "action",
				action: "profileButtonClicked",
			})
			await visibleProvider.postMessageToWebview({
				type: "updateProfileData",
			})
			break
		}
		case "/kilocode/fork": {
			const id = query.get("id")
			if (id) {
				await visibleProvider.postMessageToWebview({
					type: "invoke",
					invoke: "setChatBoxMessage",
					text: `/session fork ${id}`,
				})
				await visibleProvider.postMessageToWebview({
					type: "action",
					action: "focusInput",
				})
			}
			break
		}
		// kilocode_change end
		case "/requesty": {
			const code = query.get("code")
			const baseUrl = query.get("baseUrl")
			if (code) {
				await visibleProvider.handleRequestyCallback(code, baseUrl)
			}
			break
		}
		case "/auth/clerk/callback": {
			const code = query.get("code")
			const state = query.get("state")
			const organizationId = query.get("organizationId")
			const providerModel = query.get("provider_model")

			await CloudService.instance.handleAuthCallback(
				code,
				state,
				organizationId === "null" ? null : organizationId,
				providerModel,
			)
			break
		}
		default:
			break
	}
}
