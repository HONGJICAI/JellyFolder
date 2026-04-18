// Mock Jellyfin demo data for the service worker
// This file is imported by src/service-worker.ts

export const DEMO_HOST = 'demo.jellyfolder';
export const DEMO_SERVER = `https://${DEMO_HOST}`;
const USER_ID = 'demo-user-id';

interface MockItem {
	Id: string;
	Name: string;
	IsFolder: boolean;
	Type: string;
	ParentId?: string;
	Path?: string;
	CollectionType?: string;
	MediaType?: string;
	RunTimeTicks?: number;
	DateCreated?: string;
	ImageTags?: { Primary?: string };
	UserData?: {
		PlaybackPositionTicks: number;
		PlayCount: number;
		IsFavorite: boolean;
		Played: boolean;
		UnplayedItemCount?: number;
	};
}

// Helper: 1 minute = 600_000_000 ticks
const MIN = 600_000_000;

function video(
	id: string,
	name: string,
	parentId: string,
	parentPath: string,
	durationMin: number,
	opts: { played?: boolean; favorite?: boolean; progressMin?: number } = {}
): MockItem {
	return {
		Id: id,
		Name: name,
		IsFolder: false,
		Type: 'Video',
		ParentId: parentId,
		Path: `${parentPath}${name}.mp4`,
		MediaType: 'Video',
		RunTimeTicks: durationMin * MIN,
		DateCreated: '2025-01-15T00:00:00Z',
		ImageTags: { Primary: 'mock' },
		UserData: {
			PlaybackPositionTicks: (opts.progressMin ?? 0) * MIN,
			PlayCount: opts.played ? 1 : 0,
			IsFavorite: opts.favorite ?? false,
			Played: opts.played ?? false
		}
	};
}

function folder(id: string, name: string, parentId: string, parentPath: string): MockItem {
	return {
		Id: id,
		Name: name,
		IsFolder: true,
		Type: 'Folder',
		ParentId: parentId,
		Path: `${parentPath}${name}/`,
		ImageTags: { Primary: 'mock' }
	};
}

// --- Mock data ---

const libraries: MockItem[] = [
	{ Id: 'lib-movies', Name: 'Movies', IsFolder: true, Type: 'CollectionFolder', CollectionType: 'movies', ImageTags: { Primary: 'mock' } },
	{ Id: 'lib-tv', Name: 'TV Shows', IsFolder: true, Type: 'CollectionFolder', CollectionType: 'tvshows', ImageTags: { Primary: 'mock' } },
	{ Id: 'lib-home', Name: 'Home Videos', IsFolder: true, Type: 'CollectionFolder', CollectionType: 'homevideos', ImageTags: { Primary: 'mock' } }
];

const allItems: MockItem[] = [
	...libraries,

	// Movies > Folders
	folder('f-action', 'Action', 'lib-movies', '/movies/'),
	folder('f-scifi', 'Sci-Fi', 'lib-movies', '/movies/'),
	folder('f-comedy', 'Comedy', 'lib-movies', '/movies/'),
	folder('f-drama', 'Drama', 'lib-movies', '/movies/'),

	// Movies > Action
	video('v-matrix', 'The Matrix', 'f-action', '/movies/Action/', 136, { played: true }),
	video('v-wick', 'John Wick', 'f-action', '/movies/Action/', 101),
	video('v-madmax', 'Mad Max Fury Road', 'f-action', '/movies/Action/', 120, { favorite: true }),
	video('v-inception', 'Inception', 'f-action', '/movies/Action/', 148, { progressMin: 45 }),

	// Movies > Sci-Fi
	video('v-blade', 'Blade Runner 2049', 'f-scifi', '/movies/Sci-Fi/', 164),
	video('v-interstellar', 'Interstellar', 'f-scifi', '/movies/Sci-Fi/', 169, { played: true }),
	video('v-arrival', 'Arrival', 'f-scifi', '/movies/Sci-Fi/', 116),
	video('v-dune', 'Dune', 'f-scifi', '/movies/Sci-Fi/', 155, { played: true }),

	// Movies > Comedy
	video('v-budapest', 'The Grand Budapest Hotel', 'f-comedy', '/movies/Comedy/', 99, { played: true }),
	video('v-superbad', 'Superbad', 'f-comedy', '/movies/Comedy/', 113, { played: true }),

	// Movies > Drama
	video('v-shawshank', 'The Shawshank Redemption', 'f-drama', '/movies/Drama/', 142, { played: true, favorite: true }),
	video('v-parasite', 'Parasite', 'f-drama', '/movies/Drama/', 132),

	// TV Shows > Folders
	folder('f-bb', 'Breaking Bad', 'lib-tv', '/tv/'),
	folder('f-office', 'The Office', 'lib-tv', '/tv/'),

	// TV Shows > Breaking Bad
	video('v-bb1', 'S01E01 - Pilot', 'f-bb', '/tv/Breaking Bad/', 58, { played: true }),
	video('v-bb2', 'S01E02 - Cat\'s in the Bag', 'f-bb', '/tv/Breaking Bad/', 48, { played: true }),
	video('v-bb3', 'S01E03 - And the Bag\'s in the River', 'f-bb', '/tv/Breaking Bad/', 48),
	video('v-bb4', 'S01E04 - Cancer Man', 'f-bb', '/tv/Breaking Bad/', 48),
	video('v-bb5', 'S01E05 - Gray Matter', 'f-bb', '/tv/Breaking Bad/', 48),

	// TV Shows > The Office
	video('v-of1', 'S01E01 - Pilot', 'f-office', '/tv/The Office/', 23, { played: true }),
	video('v-of2', 'S01E02 - Diversity Day', 'f-office', '/tv/The Office/', 22, { played: true }),
	video('v-of3', 'S01E03 - Health Care', 'f-office', '/tv/The Office/', 22, { played: true }),

	// Home Videos > Folders
	folder('f-vacation', 'Vacation 2025', 'lib-home', '/home/'),
	folder('f-birthday', 'Birthday Party', 'lib-home', '/home/'),

	// Home Videos > Vacation
	video('v-vac1', 'Beach Sunset', 'f-vacation', '/home/Vacation 2025/', 5),
	video('v-vac2', 'Mountain Hike', 'f-vacation', '/home/Vacation 2025/', 12),
	video('v-vac3', 'City Tour', 'f-vacation', '/home/Vacation 2025/', 8, { played: true }),

	// Home Videos > Birthday
	video('v-bd1', 'Cake Cutting', 'f-birthday', '/home/Birthday Party/', 3, { played: true }),
	video('v-bd2', 'Opening Gifts', 'f-birthday', '/home/Birthday Party/', 7)
];

const itemMap = new Map(allItems.map((i) => [i.Id, i]));

// --- SVG image generator ---

function hashColor(id: string): [string, string] {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
	const hue = h % 360;
	return [`hsl(${hue}, 60%, 35%)`, `hsl(${(hue + 40) % 360}, 70%, 50%)`];
}

function makeSvg(id: string, name: string, width: number): Response {
	const [c1, c2] = hashColor(id);
	const height = Math.round(width * 9 / 16);
	const escaped = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	const fontSize = Math.min(18, Math.max(12, Math.round(width / 20)));
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#g)"/>
<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle"
fill="white" font-size="${fontSize}" font-family="system-ui,sans-serif" opacity="0.9">${escaped}</text>
</svg>`;
	return new Response(svg, {
		headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }
	});
}

// --- Request handler ---

// Simulate real-network latency so loading states are visible.
function fakeLatency(path: string): Promise<void> {
	const isImage = path.includes('/Images/');
	const [min, max] = isImage ? [200, 600] : [500, 1200];
	const ms = min + Math.random() * (max - min);
	return new Promise((r) => setTimeout(r, ms));
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function getChildren(parentId: string, recursive: boolean): MockItem[] {
	if (!recursive) return allItems.filter((i) => i.ParentId === parentId);
	const result: MockItem[] = [];
	const queue = [parentId];
	while (queue.length) {
		const pid = queue.shift()!;
		for (const item of allItems) {
			if (item.ParentId === pid) {
				result.push(item);
				if (item.IsFolder) queue.push(item.Id);
			}
		}
	}
	return result;
}

export async function handleDemoRequest(url: URL, request: Request): Promise<Response> {
	const path = url.pathname;
	const params = url.searchParams;
	const method = request.method;

	await fakeLatency(path);

	// POST /Users/AuthenticateByName
	if (method === 'POST' && path === '/Users/AuthenticateByName') {
		return json({
			AccessToken: 'demo-token',
			User: { Id: USER_ID, Name: 'demo', ServerId: 'demo-server' }
		});
	}

	// GET /Users/{userId}/Views
	if (path.endsWith('/Views')) {
		return json({ Items: libraries, TotalRecordCount: libraries.length });
	}

	// GET /Users/{userId}/Items
	if (path.includes('/Items')) {
		// By IDs
		const ids = params.get('Ids');
		if (ids) {
			const items = ids.split(',').map((id) => itemMap.get(id)).filter(Boolean) as MockItem[];
			return json({ Items: items, TotalRecordCount: items.length });
		}

		// By ParentId
		const parentId = params.get('ParentId');
		if (parentId) {
			const recursive = params.get('Recursive') === 'true';
			let items = getChildren(parentId, recursive);

			const mediaTypes = params.get('MediaTypes');
			if (mediaTypes) {
				const types = mediaTypes.split(',');
				items = items.filter((i) => i.MediaType && types.includes(i.MediaType));
			}

			const enableUserData = params.get('EnableUserData');
			if (enableUserData === 'false') {
				items = items.map((i) => {
					const { UserData: _, ...rest } = i;
					return rest as MockItem;
				});
			}

			return json({ Items: items, TotalRecordCount: items.length });
		}
	}

	// GET /Items/{itemId}/Images/*
	if (path.includes('/Images/')) {
		const match = path.match(/\/Items\/([^/]+)\/Images\//);
		const itemId = match?.[1] ?? '';
		const item = itemMap.get(itemId);
		const width = parseInt(params.get('maxWidth') ?? '300');
		return makeSvg(itemId, item?.Name ?? 'Unknown', width);
	}

	// GET /Items/{itemId}/PlaybackInfo
	if (path.includes('/PlaybackInfo')) {
		return json({
			MediaSources: [{ Id: 'demo-source', Name: 'Demo', Container: 'mp4', SupportsDirectPlay: true, SupportsDirectStream: true, SupportsTranscoding: false }],
			PlaySessionId: 'demo-session'
		});
	}

	// POST /Sessions/Playing/* (playback tracking)
	if (path.startsWith('/Sessions/Playing')) {
		return json({});
	}

	// POST/DELETE /Users/{userId}/PlayedItems/{itemId}
	if (path.includes('/PlayedItems/')) {
		return json({});
	}

	// POST/DELETE /Users/{userId}/FavoriteItems/{itemId}
	if (path.includes('/FavoriteItems/')) {
		return json({});
	}

	// DELETE /Items/{itemId}
	if (method === 'DELETE' && path.startsWith('/Items/')) {
		return new Response(null, { status: 204 });
	}

	// Fallback
	return new Response('Not found', { status: 404 });
}
