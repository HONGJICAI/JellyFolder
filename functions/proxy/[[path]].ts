export const onRequest: PagesFunction = async (context) => {
	const url = new URL(context.request.url);

	// Handle CORS preflight
	if (context.request.method === 'OPTIONS') {
		return new Response(null, {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': '*',
				'Access-Control-Allow-Headers': '*',
				'Access-Control-Max-Age': '86400'
			}
		});
	}

	const targetServer = url.searchParams.get('_server');
	if (!targetServer) {
		return new Response('Missing _server parameter', { status: 400 });
	}

	// Build target URL: strip /proxy prefix, remove _server param
	const path = url.pathname.replace(/^\/proxy/, '');
	const params = new URLSearchParams(url.searchParams);
	params.delete('_server');
	const query = params.toString();
	const targetUrl = `${targetServer}${path}${query ? '?' + query : ''}`;

	// Forward request headers, remove host/origin
	const headers = new Headers(context.request.headers);
	headers.delete('host');
	headers.delete('origin');
	headers.delete('referer');

	try {
		const response = await fetch(targetUrl, {
			method: context.request.method,
			headers,
			body: context.request.method !== 'GET' && context.request.method !== 'HEAD'
				? context.request.body
				: undefined
		});

		const responseHeaders = new Headers(response.headers);
		responseHeaders.set('Access-Control-Allow-Origin', '*');

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders
		});
	} catch {
		return new Response('Cannot reach server', { status: 502 });
	}
};
