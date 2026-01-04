import { vscode } from "../../utils/vscode"

const GodotyLoginScreen = () => {
	const handleSignIn = () => {
		vscode.postMessage({ type: "godotySignIn" })
	}

	return (
		<div className="flex h-full flex-col items-center justify-center p-8">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				<div className="flex flex-col items-center gap-2">
					<h1 className="text-2xl font-bold text-vscode-foreground">Welcome to Godoty</h1>
					<p className="text-vscode-descriptionForeground">
						AI-Powered Game Development Assistant for Godot Engine
					</p>
				</div>

				<div className="flex flex-col gap-3 text-sm text-vscode-descriptionForeground">
					<div className="flex items-start gap-2">
						<span className="text-vscode-charts-green">✓</span>
						<span>Visual context capture from your Godot editor</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-vscode-charts-green">✓</span>
						<span>Live documentation from your running Godot version</span>
					</div>
					<div className="flex items-start gap-2">
						<span className="text-vscode-charts-green">✓</span>
						<span>Access to 100+ AI models via LiteLLM</span>
					</div>
				</div>

				<button
					onClick={handleSignIn}
					className="w-full rounded bg-vscode-button-background px-6 py-3 font-medium text-vscode-button-foreground transition-colors hover:bg-vscode-button-hoverBackground">
					Sign In to Get Started
				</button>

				<p className="text-xs text-vscode-descriptionForeground">
					Sign in with GitHub, Google, or Email to access Godoty
				</p>
			</div>
		</div>
	)
}

export default GodotyLoginScreen
