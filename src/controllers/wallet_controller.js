import { Controller } from "@hotwired/stimulus"
import Web3Modal from "web3modal"
import WalletConnectProvider from "@walletconnect/web3-provider"
import { ethers } from "ethers"

export default class extends Controller {
	static targets = [
		"connectButton",
		"disconnectButton",
		"rentDiv",
	]

	static classes = ["hidden"]

	static contractProvider = null
	static contract = null
	static modal = null
	static provider = null
	static network = null
	static chainId = null


	async connectWallet() {
		const providerOptions = {
			walletconnect: {
				package: WalletConnectProvider,
				options: {
					rpc: {
						CHAIN_ID: RPC_PROVIDER
					},
				}
			}
		}
		this.modal = new Web3Modal({
				cacheProvider: false,
				providerOptions,
		})
		this.instance = await this.modal.connect()
		this.provider = new ethers.providers.Web3Provider(this.instance)
		this.network = await this.provider.getNetwork();
		this.chainId = this.network.chainId;

		this.connectButtonTarget.classList.add(hiddenClass)
		this.disconnectButtonTarget.classList.remove(hiddenClass)
		this.rentDivTarget.classList.remove(hiddenClass)
	}
}
