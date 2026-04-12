/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

const LOCALHOST = ['localhost', '127.0.0.1'];

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	// No proxying on localhost
	if (LOCALHOST.includes(self.location.hostname)) return;

	const url = new URL(event.request.url);

	// Only intercept cross-origin requests (to Jellyfin servers)
	if (url.origin === self.location.origin) return;

	// Rewrite: /proxy/<path>?<existing_params>&_server=<origin>
	const params = new URLSearchParams(url.search);
	params.set('_server', url.origin);

	const proxyUrl = `${self.location.origin}/proxy${url.pathname}?${params.toString()}`;

	event.respondWith(
		fetch(new Request(proxyUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: event.request.method !== 'GET' && event.request.method !== 'HEAD'
				? event.request.body
				: undefined,
			mode: 'same-origin',
			credentials: event.request.credentials,
			redirect: event.request.redirect
		}))
	);
});
