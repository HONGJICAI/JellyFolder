/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

import { DEMO_HOST, handleDemoRequest } from '$lib/demo';

if (import.meta.env.MODE === 'demo') {
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
}
