import * as vscode from "vscode"

type GodotConnectionState = "connected" | "disconnected" | "connecting" | "error"

export class GodotStatusBar implements vscode.Disposable {
	private statusBarItem: vscode.StatusBarItem
	private state: GodotConnectionState = "disconnected"

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
		this.statusBarItem.name = "Godot Connection"
		this.statusBarItem.command = "godoty.showConnectionMenu"
		this.setDisconnected()
		this.statusBarItem.show()
	}

	setConnected(): void {
		this.state = "connected"
		this.statusBarItem.text = "$(check) Godot"
		this.statusBarItem.tooltip = "Connected to Godot Editor\nClick for options"
		this.statusBarItem.backgroundColor = undefined
	}

	setDisconnected(): void {
		this.state = "disconnected"
		this.statusBarItem.text = "$(plug) Godot"
		this.statusBarItem.tooltip = "Not connected to Godot Editor\nClick to connect"
		this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground")
	}

	setConnecting(): void {
		this.state = "connecting"
		this.statusBarItem.text = "$(sync~spin) Godot"
		this.statusBarItem.tooltip = "Connecting to Godot Editor..."
		this.statusBarItem.backgroundColor = undefined
	}

	setError(message: string): void {
		this.state = "error"
		this.statusBarItem.text = "$(error) Godot"
		this.statusBarItem.tooltip = `Error: ${message}\nClick for options`
		this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground")
	}

	getState(): GodotConnectionState {
		return this.state
	}

	dispose(): void {
		this.statusBarItem.dispose()
	}
}
