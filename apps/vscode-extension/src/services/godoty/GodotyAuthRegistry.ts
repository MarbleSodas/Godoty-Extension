import type { GodotyAuthService } from "./GodotyAuthService"

let instance: GodotyAuthService | undefined

export const GodotyAuthRegistry = {
	register(auth: GodotyAuthService) {
		instance = auth
	},
	get(): GodotyAuthService | undefined {
		return instance
	},
	clear() {
		instance = undefined
	},
}
