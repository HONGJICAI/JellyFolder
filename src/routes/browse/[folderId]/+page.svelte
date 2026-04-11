<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { session, logout } from '$lib/stores/auth';
	import { JellyfinClient } from '$lib/api/client';
	import type { BaseItemDto } from '$lib/api/types';
	import Breadcrumb from '$lib/components/Breadcrumb.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import FolderCard from '$lib/components/FolderCard.svelte';
	import VideoCard from '$lib/components/VideoCard.svelte';
	import VideoPlayerOverlay from '$lib/components/VideoPlayerOverlay.svelte';

	let folders: BaseItemDto[] = $state([]);
	let videos: BaseItemDto[] = $state([]);
	let loading = $state(true);
	let loadingCounts = $state(false);
	let loadingUserData = $state(false);
	let error = $state('');
	let currentRequestId = 0;

	let playingVideo: BaseItemDto | null = $state(null);
	let hideWatched = $state(false);
	let sortBy: 'name' | 'date' | 'size' = $state('name');
	let sortAsc = $state(true);
	let foldersCollapsed = $state(false);
	let videosCollapsed = $state(false);

	let folderId = $derived($page.params.folderId ?? '');

	function getClient(): JellyfinClient | null {
		if (!$session) return null;
		return new JellyfinClient($session);
	}

	let filteredVideos = $derived.by(() => {
		let v = videos;
		if (hideWatched) v = v.filter((v) => !v.UserData?.Played);
		return v;
	});

	let filteredFolders = $derived.by(() => {
		let f = folders;
		if (hideWatched) f = f.filter((f) => (f.UserData?.UnplayedItemCount ?? 0) > 0);
		return f;
	});

	function toggleSort(field: 'name' | 'date' | 'size') {
		if (sortBy === field) { sortAsc = !sortAsc; }
		else { sortBy = field; sortAsc = field === 'name'; }
		loadData(folderId);
	}

	async function loadData(id: string) {
		const client = getClient();
		if (!client) return;

		const requestId = ++currentRequestId;
		const isStale = () => requestId !== currentRequestId;

		loading = true;
		loadingUserData = false;
		loadingCounts = false;
		error = '';
		folders = [];
		videos = [];

		const sortByMap = { name: 'SortName', date: 'DateCreated', size: 'Size' };
		const jellyfinSortBy = `IsFolder,${sortByMap[sortBy]}`;
		const jellyfinSortOrder = `Descending,${sortAsc ? 'Ascending' : 'Descending'}`;

		try {
			// Phase 1: Get items WITHOUT UserData (~10ms)
			// TODO: After updating Jellyfin, test if non-recursive query with EnableUserData=true
			// is faster. Profile with: scripts/profile-api.ts
			const itemsResponse = await client.getItems(id, {
				recursive: false,
				fields: 'DateCreated,Path',
				sortBy: jellyfinSortBy,
				sortOrder: jellyfinSortOrder,
				enableUserData: false
			});
			if (isStale()) return;

			const newFolders: BaseItemDto[] = [];
			const newVideos: BaseItemDto[] = [];
			for (const item of itemsResponse.Items) {
				if (item.IsFolder) newFolders.push(item);
				else newVideos.push(item);
			}

			folders = newFolders;
			videos = newVideos;
			loading = false;

			// Phase 2: Get UserData + unplayed counts
			// Leaf folder (only videos): Ids param (~63ms)
			// Mixed folder (has subfolders): recursive query (~1-4s)
			loadingUserData = newVideos.length > 0;
			loadingCounts = newFolders.length > 0;

			if (newFolders.length === 0 && newVideos.length > 0) {
				// Leaf: fast Ids query
				const idsResponse = await client.getItemsByIds(newVideos.map((v) => v.Id));
				if (isStale()) return;

				const dataMap = new Map(idsResponse.Items.map((i) => [i.Id, i]));
				for (const video of newVideos) {
					const full = dataMap.get(video.Id);
					if (full) {
						video.UserData = full.UserData;
						video.RunTimeTicks = full.RunTimeTicks ?? video.RunTimeTicks;
					}
				}
				videos = [...newVideos];
				loadingUserData = false;

			} else if (newFolders.length > 0) {
				// Mixed: recursive query for UserData + unplayed counts
				const allVideos = await client.getItems(id, {
					recursive: true,
					mediaTypes: 'Video',
					fields: 'Path'
				});
				if (isStale()) return;

				// Enrich direct video children with UserData
				if (newVideos.length > 0) {
					const userDataMap = new Map(allVideos.Items.map((v) => [v.Id, v]));
					for (const video of newVideos) {
						const full = userDataMap.get(video.Id);
						if (full) {
							video.UserData = full.UserData;
							video.RunTimeTicks = full.RunTimeTicks ?? video.RunTimeTicks;
						}
					}
					videos = [...newVideos];
				}
				loadingUserData = false;

				// Compute unplayed counts per folder
				// Append separator to avoid prefix collisions (e.g., "Foo" matching "Foo Bar/video.mp4")
				const folderPaths = newFolders.filter((f) => f.Path).map((f) => ({
					id: f.Id,
					path: f.Path!.endsWith('/') ? f.Path! : f.Path! + '/'
				}));
				const countMap = new Map<string, number>();
				for (const f of folderPaths) countMap.set(f.id, 0);

				for (const video of allVideos.Items) {
					if (!video.Path || video.UserData?.Played) continue;
					for (const f of folderPaths) {
						if (video.Path.startsWith(f.path)) {
							countMap.set(f.id, (countMap.get(f.id) ?? 0) + 1);
							break;
						}
					}
				}



				for (const folder of newFolders) {
					const count = countMap.get(folder.Id) ?? 0;
					if (folder.UserData) {
						folder.UserData.UnplayedItemCount = count;
					} else {
						folder.UserData = { PlaybackPositionTicks: 0, PlayCount: 0, IsFavorite: false, Played: false, UnplayedItemCount: count };
					}
				}
				folders = [...newFolders];
				loadingCounts = false;
			}
		} catch (err) {
			if (isStale()) return;
			if (err instanceof Error && err.message.includes('401')) {
				logout();
				goto('/login');
				return;
			}
			error = err instanceof Error ? err.message : 'Failed to load folder';
			loading = false;
			loadingUserData = false;
			loadingCounts = false;
		}
	}

	$effect(() => {
		loadData(folderId);
	});

	async function markPlayed(itemId: string) {
		const client = getClient();
		if (!client) return;
		await client.markPlayed(itemId);
	}

	async function markUnplayed(itemId: string) {
		const client = getClient();
		if (!client) return;
		await client.markUnplayed(itemId);
	}

	async function markFavorite(itemId: string) {
		const client = getClient();
		if (!client) return;
		await client.markFavorite(itemId);
	}

	async function unmarkFavorite(itemId: string) {
		const client = getClient();
		if (!client) return;
		await client.unmarkFavorite(itemId);
	}

	async function deleteItem(itemId: string) {
		const client = getClient();
		if (!client) return;
		await client.deleteItem(itemId);
		videos = videos.filter((v) => v.Id !== itemId);
	}

	async function deleteFolder(folderId: string) {
		const client = getClient();
		if (!client) return;
		await client.deleteItem(folderId);
		folders = folders.filter((f) => f.Id !== folderId);
	}

	function openPlayer(video: BaseItemDto) {
		playingVideo = video;
	}

	function closePlayer() {
		playingVideo = null;
		loadData(folderId);
	}
</script>

<div class="mx-auto max-w-7xl px-5 pt-8 pb-12">
	<div class="mb-7">
		<Breadcrumb />
	</div>

	<!-- Toolbar -->
	<div class="mb-7 flex flex-wrap items-center gap-2">
		<button
			onclick={() => (hideWatched = !hideWatched)}
			class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-200
				{hideWatched
				? 'bg-accent-dim text-accent ring-1 ring-accent/20'
				: 'bg-surface-2 text-text-muted hover:text-text-secondary'}"
		>
			{#if hideWatched}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
				</svg>
				Unplayed only
			{:else}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
				Hide watched
			{/if}
		</button>

		<div class="mx-1 h-5 w-px bg-border/60"></div>

		<div class="flex items-center rounded-xl bg-surface-2 p-0.5">
			{#each [
				{ key: 'name', label: 'Name' },
				{ key: 'date', label: 'Date' },
				{ key: 'size', label: 'Size' }
			] as { key, label } (key)}
				<button
					onclick={() => toggleSort(key as 'name' | 'date' | 'size')}
					class="flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-all duration-200
						{sortBy === key
						? 'bg-surface-3 text-text-primary shadow-sm'
						: 'text-text-muted hover:text-text-secondary'}"
				>
					{label}
					{#if sortBy === key}
						<svg class="h-3 w-3 transition-transform duration-200 {sortAsc ? '' : 'rotate-180'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(8) as _}
				<div class="overflow-hidden rounded-2xl border border-border/40 bg-surface-1">
					<div class="aspect-video w-full animate-pulse bg-surface-2"></div>
					<div class="p-4">
						<div class="h-4 w-3/4 animate-pulse rounded-md bg-surface-2"></div>
						<div class="mt-2.5 h-3 w-1/3 animate-pulse rounded-md bg-surface-2"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[14px] text-danger">{error}</div>
	{:else}
		{#if filteredFolders.length === 0 && filteredVideos.length === 0}
			<div class="flex flex-col items-center justify-center py-24 text-text-muted">
				{#if hideWatched && (videos.length > 0 || folders.length > 0)}
					<div class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-dim">
						<svg class="h-8 w-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<p class="text-lg font-medium text-text-secondary">All caught up</p>
					<p class="mt-1 text-[14px]">Everything in this folder has been watched</p>
					<button onclick={() => (hideWatched = false)} class="mt-5 rounded-xl bg-surface-2 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-3">
						Show all
					</button>
				{:else}
					<div class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
						<svg class="h-8 w-8 text-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
					</div>
					<p class="text-lg font-medium text-text-secondary">Empty folder</p>
					<p class="mt-1 text-[14px]">Nothing here yet</p>
				{/if}
			</div>
		{/if}

		{#if filteredFolders.length > 0}
			<SectionHeader title="Folders" count={filteredFolders.length} bind:collapsed={foldersCollapsed}>
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each filteredFolders as folder (folder.Id)}
						<FolderCard {folder} serverUrl={$session?.serverUrl ?? ''} {loadingCounts} {markFavorite} {unmarkFavorite} deleteItem={deleteFolder} />
					{/each}
				</div>
			</SectionHeader>
		{/if}

		{#if filteredVideos.length > 0}
			<SectionHeader title="Videos" count={hideWatched && filteredVideos.length !== videos.length ? `${filteredVideos.length} / ${videos.length}` : filteredVideos.length} bind:collapsed={videosCollapsed}>
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each filteredVideos as video (video.Id)}
						<VideoCard {video} serverUrl={$session?.serverUrl ?? ''} onplay={openPlayer} {markPlayed} {markUnplayed} {markFavorite} {unmarkFavorite} {deleteItem} {loadingUserData} />
					{/each}
				</div>
			</SectionHeader>
		{/if}
	{/if}
</div>

{#if playingVideo}
	<VideoPlayerOverlay video={playingVideo} onclose={closePlayer} />
{/if}
