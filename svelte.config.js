import adapter from '@sveltejs/adapter-static';
import { relative, sep } from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, execept for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		adapter: adapter({
			fallback: '404.html' // GitHub Pages serves 404.html for unknown routes, acts as SPA fallback
		}),
		paths: {
			// Set to repo name for GitHub Pages (https://username.github.io/JellyFolder/)
			// Remove or set to '' for custom domain or root deployment
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;
