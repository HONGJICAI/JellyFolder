/**
 * Profile Jellyfin API — compare e2e strategies for folder browsing.
 * Usage: npx tsx scripts/profile-api.ts
 *
 * Requires .env file with JELLYFIN_URL, JELLYFIN_USERNAME, JELLYFIN_PASSWORD, JELLYFIN_TARGET_PARENT_ID
 */

import { config } from 'dotenv';
config();

const SERVER_URL = process.env.JELLYFIN_URL!;
const USERNAME = process.env.JELLYFIN_USERNAME!;
const PASSWORD = process.env.JELLYFIN_PASSWORD!;
const TARGET_PARENT_ID = process.env.JELLYFIN_TARGET_PARENT_ID!;

if (!SERVER_URL || !USERNAME || !TARGET_PARENT_ID) {
	console.error('Missing env vars. Copy .env.example to .env and fill in values.');
	process.exit(1);
}

interface AuthResult {
	AccessToken: string;
	User: { Id: string };
}

let token = '';
let userId = '';
let base = '';
let headers: Record<string, string> = {};

async function authenticate() {
	const res = await fetch(`${SERVER_URL}/Users/AuthenticateByName`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'MediaBrowser Client="ProfileTest", Device="CLI", DeviceId="profile-test", Version="1.0.0"'
		},
		body: JSON.stringify({ Username: USERNAME, Pw: PASSWORD })
	});
	const data: AuthResult = await res.json();
	token = data.AccessToken;
	userId = data.User.Id;
	base = `${SERVER_URL}/Users/${userId}/Items`;
	headers = {
		Authorization: `MediaBrowser Client="ProfileTest", Device="CLI", DeviceId="profile-test", Version="1.0.0", Token="${token}"`
	};
}

async function fetchJson(url: string): Promise<any> {
	const res = await fetch(url, { headers });
	return res.json();
}

async function time(label: string, fn: () => Promise<any>): Promise<{ ms: number; result: any }> {
	const start = performance.now();
	const result = await fn();
	const ms = Math.round(performance.now() - start);
	console.log(`  ${label}: ${ms}ms`);
	return { ms, result };
}

async function main() {
	console.log('Authenticating...');
	await authenticate();

	const id = TARGET_PARENT_ID;

	// === Individual query benchmarks ===
	console.log(`\n=== Individual queries (ParentId=${id}) ===\n`);

	await time('Non-recursive, EnableUserData=false', () =>
		fetchJson(`${base}?ParentId=${id}&Recursive=false&Fields=DateCreated,Path&EnableUserData=false&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending`)
	);

	await time('Non-recursive, WITH UserData (the slow one)', () =>
		fetchJson(`${base}?ParentId=${id}&Recursive=false`)
	);

	await time('Recursive, all videos, Fields=Path (WITH UserData)', () =>
		fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path`)
	);

	await time('Recursive, all videos, NO UserData', () =>
		fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path&EnableUserData=false`)
	);

	await time('Recursive, unplayed videos only, Fields=Path', () =>
		fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path&Filters=IsUnplayed`)
	);

	// === Strategy A: Current 2-phase ===
	// Phase 1: non-recursive EnableUserData=false
	// Phase 2: recursive all videos with UserData + Path
	console.log('\n=== Strategy A: Current (non-rec no-UserData + recursive all videos) ===\n');
	{
		const { ms: ms1, result: r1 } = await time('A.1: Items (EnableUserData=false)', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=false&Fields=DateCreated,Path&EnableUserData=false&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending`)
		);
		const { ms: ms2, result: r2 } = await time('A.2: Recursive all videos + Path + UserData', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path`)
		);
		const folders = r1.Items.filter((i: any) => i.IsFolder).length;
		const videos = r1.Items.filter((i: any) => !i.IsFolder).length;
		const recVideos = r2.TotalRecordCount;
		console.log(`  Items: ${folders} folders, ${videos} videos | Recursive: ${recVideos} videos`);
		console.log(`  Phase 1 (visible): ${ms1}ms | Phase 2 (enrich): ${ms2}ms | Total: ${ms1 + ms2}ms`);
	}

	// === Strategy B: recursive no-UserData + recursive unplayed with UserData ===
	// Phase 1: recursive all items, no UserData (get structure + paths fast)
	// Phase 2: recursive unplayed videos with UserData (smaller set, has played info)
	console.log('\n=== Strategy B: Recursive no-UserData + Recursive unplayed with UserData ===\n');
	{
		const { ms: ms1, result: r1 } = await time('B.1: Recursive all, EnableUserData=false', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=false&Fields=DateCreated,Path&EnableUserData=false&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending`)
		);
		const { ms: ms2, result: r2 } = await time('B.2: Recursive unplayed videos + Path + UserData', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path&Filters=IsUnplayed`)
		);
		const recUnplayed = r2.TotalRecordCount;
		console.log(`  Unplayed videos: ${recUnplayed}`);
		console.log(`  Phase 1 (visible): ${ms1}ms | Phase 2 (enrich): ${ms2}ms | Total: ${ms1 + ms2}ms`);
		console.log(`  NOTE: This strategy only gets UserData for UNPLAYED videos.`);
		console.log(`  Played videos would show as unplayed until we infer from absence.`);
	}

	// === Strategy C: Single recursive query with UserData ===
	console.log('\n=== Strategy C: Single recursive all videos with UserData ===\n');
	{
		const { ms: ms1, result: r1 } = await time('C.1: Recursive all videos + Path + UserData', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=true&MediaTypes=Video&Fields=Path`)
		);
		const total = r1.TotalRecordCount;
		const unplayed = r1.Items.filter((v: any) => !v.UserData?.Played).length;
		console.log(`  Total: ${total} videos, Unplayed: ${unplayed}`);
		console.log(`  Single call: ${ms1}ms`);
		console.log(`  NOTE: No folder listing — would need to extract folders from Path prefixes or separate call.`);
	}

	// === Strategy D: Non-recursive WITH UserData (baseline, the slow one) ===
	console.log('\n=== Strategy D: Single non-recursive WITH UserData (baseline) ===\n');
	{
		const { ms: ms1, result: r1 } = await time('D.1: Non-recursive WITH UserData', () =>
			fetchJson(`${base}?ParentId=${id}&Recursive=false&SortBy=IsFolder,SortName&SortOrder=Descending,Ascending`)
		);
		const folders = r1.Items.filter((i: any) => i.IsFolder).length;
		const videos = r1.Items.filter((i: any) => !i.IsFolder).length;
		console.log(`  Items: ${folders} folders, ${videos} videos`);
		console.log(`  Single call: ${ms1}ms`);
	}

	console.log('\n=== Summary ===\n');
	console.log('Strategy A (current): fast initial render + async enrich');
	console.log('Strategy B: fast initial render + smaller enrich (unplayed only)');
	console.log('Strategy C: single call, no initial render until done');
	console.log('Strategy D: single slow call (baseline)');

	console.log('\n=== Done ===');
}

main().catch(console.error);
