import { ReactNode } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import GodotyLoginScreen from "./GodotyLoginScreen"

interface AuthGuardProps {
	children: ReactNode
}

const AuthGuard = ({ children }: AuthGuardProps) => {
	const { godotyAuthenticated, godotyAuthPending, didHydrateState } = useExtensionState()

	if (!didHydrateState || godotyAuthPending) {
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "100%",
					padding: "20px",
				}}>
				<div
					style={{
						width: "24px",
						height: "24px",
						border: "2px solid var(--vscode-foreground)",
						borderTopColor: "transparent",
						borderRadius: "50%",
						animation: "spin 1s linear infinite",
					}}
				/>
				<style>{`
					@keyframes spin {
						to { transform: rotate(360deg); }
					}
				`}</style>
			</div>
		)
	}

	if (!godotyAuthenticated) {
		return <GodotyLoginScreen />
	}

	return <>{children}</>
}

export default AuthGuard
