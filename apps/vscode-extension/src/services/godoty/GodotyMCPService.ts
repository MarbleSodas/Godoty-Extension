import * as vscode from "vscode"
import * as path from "path"
import { spawn, ChildProcess } from "child_process"

import { Package } from "../../shared/package"

const GODOT_MCP_TOOLS = [
	"godot_capture_viewport",
	"godot_capture_game",
	"godot_get_docs",
	"godot_search_docs",
	"godot_get_scene",
	"godot_get_selected",
	"godot_get_node",
	"godot_run_action",
	"godot_get_errors",
] as const

interface McpServerConfig {
	command: string
	args: string[]
	disabled?: boolean
	alwaysAllow?: string[]
}

export class GodotyMCPService implements vscode.Disposable {
	private mcpProcess: ChildProcess | null = null
	private context: vscode.ExtensionContext
	private outputChannel: vscode.OutputChannel
	private disposables: vscode.Disposable[] = []

	private _isConnected = false
	private _onConnectionChange = new vscode.EventEmitter<boolean>()
	readonly onConnectionChange = this._onConnectionChange.event

	constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
		this.context = context
		this.outputChannel = outputChannel
		this.disposables.push(this._onConnectionChange)
	}

	get isConnected(): boolean {
		return this._isConnected
	}

	async start(): Promise<void> {
		if (this.mcpProcess) {
			this.log("MCP server already running")
			return
		}

		const mcpPath = this.getMcpServerPath()
		this.log(`Starting Godoty MCP server: ${mcpPath}`)

		try {
			this.mcpProcess = spawn("node", [mcpPath], {
				stdio: ["pipe", "pipe", "pipe"],
				env: { ...process.env },
			})

			this.mcpProcess.stdout?.on("data", (data) => {
				this.log(`[stdout] ${data.toString().trim()}`)
			})

			this.mcpProcess.stderr?.on("data", (data) => {
				this.log(`[stderr] ${data.toString().trim()}`)
			})

			this.mcpProcess.on("error", (error) => {
				this.log(`Process error: ${error.message}`)
				this._isConnected = false
				this._onConnectionChange.fire(false)
			})

			this.mcpProcess.on("exit", (code) => {
				this.log(`Process exited with code ${code}`)
				this.mcpProcess = null
				this._isConnected = false
				this._onConnectionChange.fire(false)
			})

			await this.registerWithExtension()
			this._isConnected = true
			this._onConnectionChange.fire(true)
			this.log("MCP server started and registered")
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.log(`Failed to start MCP server: ${message}`)
			throw error
		}
	}

	async stop(): Promise<void> {
		if (this.mcpProcess) {
			this.log("Stopping MCP server")
			this.mcpProcess.kill()
			this.mcpProcess = null
			this._isConnected = false
			this._onConnectionChange.fire(false)
		}
	}

	async restart(): Promise<void> {
		await this.stop()
		await this.start()
	}

	private getMcpServerPath(): string {
		return path.join(this.context.extensionPath, "dist", "mcp", "godoty-mcp.js")
	}

	private async registerWithExtension(): Promise<void> {
		const config = vscode.workspace.getConfiguration(Package.name)
		const mcpServers = config.get<Record<string, McpServerConfig>>("mcpServers", {})

		const godotyMcpConfig: McpServerConfig = {
			command: "node",
			args: [this.getMcpServerPath()],
			disabled: false,
			alwaysAllow: [...GODOT_MCP_TOOLS],
		}

		const existingConfig = mcpServers["godoty"]
		const needsUpdate =
			!existingConfig ||
			existingConfig.disabled === true ||
			existingConfig.args?.[0] !== godotyMcpConfig.args[0]

		if (needsUpdate) {
			mcpServers["godoty"] = godotyMcpConfig
			await config.update("mcpServers", mcpServers, vscode.ConfigurationTarget.Global)
			this.log("Registered Godoty MCP server in configuration")
		} else {
			this.log("Godoty MCP server already registered")
		}
	}

	async unregister(): Promise<void> {
		const config = vscode.workspace.getConfiguration(Package.name)
		const mcpServers = config.get<Record<string, McpServerConfig>>("mcpServers", {})

		if (mcpServers["godoty"]) {
			delete mcpServers["godoty"]
			await config.update("mcpServers", mcpServers, vscode.ConfigurationTarget.Global)
			this.log("Unregistered Godoty MCP server")
		}
	}

	getServerConfig(): McpServerConfig {
		return {
			command: "node",
			args: [this.getMcpServerPath()],
			disabled: false,
			alwaysAllow: [...GODOT_MCP_TOOLS],
		}
	}

	showLogs(): void {
		this.outputChannel.show()
	}

	private log(message: string): void {
		this.outputChannel.appendLine(`[GodotyMCP] ${message}`)
	}

	dispose(): void {
		this.stop()
		this.disposables.forEach((d) => d.dispose())
	}
}
