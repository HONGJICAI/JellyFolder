import type {
	AuthenticationResult,
	BaseItemDto,
	ItemsResponse,
	PlaybackInfoResponse,
	PlaybackProgressReport,
	PlaybackStartReport,
	PlaybackStopReport,
	SessionInfo
} from './types';

function authHeader(token?: string): string {
	const parts = [
		'Client="JellyFolder"',
		'Device="Browser"',
		'DeviceId="jellyfolder-web"',
		'Version="1.0.0"'
	];
	if (token) {
		parts.push(`Token="${token}"`);
	}
	return `MediaBrowser ${parts.join(', ')}`;
}

export async function authenticate(
	serverUrl: string,
	username: string,
	password: string
): Promise<AuthenticationResult> {
	let res: Response;
	try {
		res = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: authHeader()
			},
			body: JSON.stringify({ Username: username, Pw: password })
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) {
			throw new Error(`Cannot connect to server. Check the URL and ensure you're using the correct protocol (http vs https).`);
		}
		throw new Error(`Cannot reach server: ${msg}`);
	}
	if (res.status === 401) {
		throw new Error('Invalid username or password.');
	}
	if (!res.ok) {
		throw new Error(`Authentication failed (HTTP ${res.status}). Check your server URL.`);
	}
	return res.json();
}

export class JellyfinClient {
	constructor(private session: SessionInfo) {}

	private headers(): Record<string, string> {
		return {
			Authorization: authHeader(this.session.token),
			'Content-Type': 'application/json'
		};
	}

	private url(path: string): string {
		return `${this.session.serverUrl}${path}`;
	}

	private checkResponse(res: Response, context: string): void {
		if (res.status === 401) throw new Error('Session expired. Please log in again.');
		if (!res.ok) throw new Error(`${context}: ${res.status}`);
	}

	async getViews(): Promise<ItemsResponse> {
		const res = await fetch(this.url(`/Users/${this.session.userId}/Views`), {
			headers: this.headers()
		});
		this.checkResponse(res, 'Failed to get views');
		return res.json();
	}

	async getItems(
		parentId: string,
		options: {
			recursive?: boolean;
			fields?: string;
			sortBy?: string;
			sortOrder?: string;
			filters?: string;
			includeItemTypes?: string;
			mediaTypes?: string;
			limit?: number;
			startIndex?: number;
			enableUserData?: boolean;
			enableImages?: boolean;
		} = {}
	): Promise<ItemsResponse> {
		const params = new URLSearchParams({ ParentId: parentId });
		if (options.recursive !== undefined) params.set('Recursive', String(options.recursive));
		if (options.fields) params.set('Fields', options.fields);
		if (options.sortBy) params.set('SortBy', options.sortBy);
		if (options.sortOrder) params.set('SortOrder', options.sortOrder);
		if (options.filters) params.set('Filters', options.filters);
		if (options.includeItemTypes) params.set('IncludeItemTypes', options.includeItemTypes);
		if (options.startIndex !== undefined) params.set('StartIndex', String(options.startIndex));
		if (options.mediaTypes) params.set('MediaTypes', options.mediaTypes);
		if (options.limit !== undefined) params.set('Limit', String(options.limit));
		if (options.enableUserData !== undefined) params.set('EnableUserData', String(options.enableUserData));
		if (options.enableImages !== undefined) params.set('EnableImages', String(options.enableImages));

		const res = await fetch(this.url(`/Users/${this.session.userId}/Items?${params}`), {
			headers: this.headers()
		});
		this.checkResponse(res, 'Failed to get items');
		return res.json();
	}

	async getItemsByIds(ids: string[], options: { enableUserData?: boolean } = {}): Promise<ItemsResponse> {
		if (ids.length === 0) return { Items: [], TotalRecordCount: 0 };
		const params = new URLSearchParams({ Ids: ids.join(',') });
		if (options.enableUserData !== undefined) params.set('EnableUserData', String(options.enableUserData));
		const res = await fetch(this.url(`/Users/${this.session.userId}/Items?${params}`), {
			headers: this.headers()
		});
		this.checkResponse(res, 'Failed to get items by IDs');
		return res.json();
	}

	async getItem(itemId: string): Promise<BaseItemDto> {
		const res = await fetch(
			this.url(`/Users/${this.session.userId}/Items/${itemId}`),
			{ headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to get item');
		return res.json();
	}

	async markPlayed(itemId: string): Promise<void> {
		const res = await fetch(
			this.url(`/Users/${this.session.userId}/PlayedItems/${itemId}`),
			{ method: 'POST', headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to mark played');
	}

	async markUnplayed(itemId: string): Promise<void> {
		const res = await fetch(
			this.url(`/Users/${this.session.userId}/PlayedItems/${itemId}`),
			{ method: 'DELETE', headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to mark unplayed');
	}

	async markFavorite(itemId: string): Promise<void> {
		const res = await fetch(
			this.url(`/Users/${this.session.userId}/FavoriteItems/${itemId}`),
			{ method: 'POST', headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to mark favorite');
	}

	async unmarkFavorite(itemId: string): Promise<void> {
		const res = await fetch(
			this.url(`/Users/${this.session.userId}/FavoriteItems/${itemId}`),
			{ method: 'DELETE', headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to unmark favorite');
	}

	async deleteItem(itemId: string): Promise<void> {
		const res = await fetch(this.url(`/Items/${itemId}`), {
			method: 'DELETE',
			headers: this.headers()
		});
		if (res.status === 401) throw new Error('Session expired. Please log in again.');
		if (res.status === 403) {
			throw new Error('No permission to delete. Ask your server admin to enable deletion for your account.');
		}
		if (!res.ok) {
			let detail = '';
			try {
				const body = await res.text();
				if (body) detail = `: ${body}`;
			} catch { /* ignore */ }
			throw new Error(`Delete failed (HTTP ${res.status})${detail}`);
		}
	}

	imageUrl(itemId: string, tag?: string, maxWidth = 300): string {
		const params = new URLSearchParams({ maxWidth: String(maxWidth) });
		if (tag) params.set('tag', tag);
		return `${this.session.serverUrl}/Items/${itemId}/Images/Primary?${params}`;
	}

	streamUrl(itemId: string, container = 'mp4'): string {
		const params = new URLSearchParams({
			static: 'true',
			api_key: this.session.token
		});
		return `${this.session.serverUrl}/Videos/${itemId}/stream.${container}?${params}`;
	}

	async getPlaybackInfo(itemId: string): Promise<PlaybackInfoResponse> {
		const res = await fetch(
			this.url(`/Items/${itemId}/PlaybackInfo?UserId=${this.session.userId}`),
			{ headers: this.headers() }
		);
		this.checkResponse(res, 'Failed to get playback info');
		return res.json();
	}

	async reportPlaybackStart(data: PlaybackStartReport): Promise<void> {
		await fetch(this.url('/Sessions/Playing'), {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(data)
		});
	}

	async reportPlaybackProgress(data: PlaybackProgressReport): Promise<void> {
		await fetch(this.url('/Sessions/Playing/Progress'), {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(data)
		});
	}

	async reportPlaybackStopped(data: PlaybackStopReport): Promise<void> {
		await fetch(this.url('/Sessions/Playing/Stopped'), {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(data)
		});
	}
}
