import { Application } from "@hotwired/stimulus"
import WalletController from "./controllers/wallet_controller.js"

window.Stimulus = Application.start()

Stimulus.handleError = (error, message, detail) => {
		console.warn(message, detail)
		ErrorTrackingSystem.captureException(error)
}

const CHAIN_ID = 4002
const RPC_PROVIDER = "https://rpc.testnet.fantom.network"

Stimulus.register("wallet", WalletController)
