import * as vscode from "vscode"
import type { User } from "@supabase/supabase-js"

export class UserStatusBar implements vscode.Disposable {
	private statusBarItem: vscode.StatusBarItem
	private currentUser: User | null = null

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99)
		this.statusBarItem.name = "Godoty User"
		this.statusBarItem.command = "godoty.showUserMenu"
		this.setSignedOut()
		this.statusBarItem.show()
	}

	setUser(user: User): void {
		this.currentUser = user
		const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"
		this.statusBarItem.text = `$(account) ${displayName}`
		this.statusBarItem.tooltip = `Signed in as ${user.email}\nClick for account options`
		this.statusBarItem.backgroundColor = undefined
	}

	setSignedOut(): void {
		this.currentUser = null
		this.statusBarItem.text = "$(sign-in) Godoty"
		this.statusBarItem.tooltip = "Sign in to Godoty"
		this.statusBarItem.backgroundColor = undefined
	}

	getUser(): User | null {
		return this.currentUser
	}

	isSignedIn(): boolean {
		return this.currentUser !== null
	}

	dispose(): void {
		this.statusBarItem.dispose()
	}
}
