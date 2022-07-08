import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
	context: 'window',
  input: 'src/app.js',
  output: {
    format: 'iife',
    file: 'dist/app.js',
		globals: {
			'web3modal': 'Web3Modal',
		}
  },
	plugins: [
		nodeResolve({
			modulesOnly: true,
		}),
		babel(),
	],
	external: [
		'web3modal',
	],
}
