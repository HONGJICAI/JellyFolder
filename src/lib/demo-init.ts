import { DEMO_HOST, handleDemoRequest } from './demo';

if (import.meta.env.MODE === 'demo' && typeof window !== 'undefined') {
	const originalFetch = window.fetch.bind(window);
	window.fetch = async (input, init) => {
		const urlStr =
			typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
		try {
			const url = new URL(urlStr);
			if (url.hostname === DEMO_HOST) {
				return handleDemoRequest(url, new Request(input, init));
			}
		} catch {
			// Relative URL or invalid — fall through to original fetch.
		}
		return originalFetch(input, init);
	};
}
