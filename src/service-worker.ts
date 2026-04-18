/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { DEMO_HOST, handleDemoRequest } from '$lib/demo';

// Always-on: fetch handler only fires for DEMO_HOST, which only appears in demo sessions.
// Gating on import.meta.env.MODE fails because SvelteKit's SW build doesn't inherit `--mode demo`.

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);
	if (url.hostname === DEMO_HOST) {
		event.respondWith(handleDemoRequest(url, event.request));
	}
});
