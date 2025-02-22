import { defineConfig } from 'vite'
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
	const baseConf = {
		css: {
			preprocessorOptions: {
				scss: {
					silenceDeprecations: [ "legacy-js-api" ],
				},
			},
		},
		define: {
			'__APP_VERSION__': JSON.stringify(process.env.npm_package_version)
		},
		plugins: [
			react()
		],
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, 'src') }
			],
		}
	}

	// If we are serving a local dev version
	if(command === 'serve') {
		baseConf.server = {
			host: 'tims.local',
			port: 3101,
			strictPort: true
		}
	}

	// Return the config
	return baseConf;
})