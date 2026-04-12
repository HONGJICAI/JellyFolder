<script lang="ts">
	import type { BaseItemDto } from '$lib/api/types';
	import { formatDuration } from '$lib/utils/format';
	import ActionButton from './ActionButton.svelte';

	let {
		video,
		serverUrl,
		onplay,
		markPlayed,
		markUnplayed,
		markFavorite,
		unmarkFavorite,
		deleteItem,
		loadingUserData = false
	}: {
		video: BaseItemDto;
		serverUrl: string;
		onplay: (video: BaseItemDto) => void;
		markPlayed: (id: string) => Promise<void>;
		markUnplayed: (id: string) => Promise<void>;
		markFavorite: (id: string) => Promise<void>;
		unmarkFavorite: (id: string) => Promise<void>;
		deleteItem: (id: string) => Promise<void>;
		loadingUserData?: boolean;
	} = $props();

	let imageUrl = $derived.by(() => {
		if (video.ImageTags?.Primary) {
			return `${serverUrl}/Items/${video.Id}/Images/Primary?maxWidth=300&tag=${video.ImageTags.Primary}`;
		}
		if (video.ImageTags?.Thumb) {
			return `${serverUrl}/Items/${video.Id}/Images/Thumb?maxWidth=300&tag=${video.ImageTags.Thumb}`;
		}
		if (video.BackdropImageTags?.length) {
			return `${serverUrl}/Items/${video.Id}/Images/Backdrop?maxWidth=300&tag=${video.BackdropImageTags[0]}`;
		}
		// Fallback: ask Jellyfin to extract a frame from the video
		return `${serverUrl}/Items/${video.Id}/Images/Primary?maxWidth=300`;
	});

	let played = $state(video.UserData?.Played ?? false);
	let favorite = $state(video.UserData?.IsFavorite ?? false);
	let positionTicks = $state(video.UserData?.PlaybackPositionTicks ?? 0);

	// Sync from prop when UserData arrives (Phase 2 enrichment)
	$effect(() => {
		played = video.UserData?.Played ?? false;
		favorite = video.UserData?.IsFavorite ?? false;
		positionTicks = video.UserData?.PlaybackPositionTicks ?? 0;
	});

	let progressPercent = $derived(
		positionTicks > 0 && video.RunTimeTicks
			? Math.min((positionTicks / video.RunTimeTicks) * 100, 100)
			: 0
	);
	let savingPlayed = $state(false);
	let savingFavorite = $state(false);
	let showConfirmDelete = $state(false);
	let deleted = $state(false);
	let deleteError = $state('');
	let playError = $state('');

	async function togglePlayed() {
		savingPlayed = true;
		playError = '';
		try {
			if (!played) {
				await markPlayed(video.Id);
				played = true;
				if (video.UserData) video.UserData.Played = true;
			} else {
				await markUnplayed(video.Id);
				played = false;
				if (video.UserData) video.UserData.Played = false;
			}
		} catch (err) {
			playError = err instanceof Error ? err.message : 'Failed to update';
			setTimeout(() => (playError = ''), 4000);
		} finally {
			savingPlayed = false;
		}
	}

	async function toggleFavorite() {
		savingFavorite = true;
		try {
			if (!favorite) {
				await markFavorite(video.Id);
				favorite = true;
				if (video.UserData) video.UserData.IsFavorite = true;
			} else {
				await unmarkFavorite(video.Id);
				favorite = false;
				if (video.UserData) video.UserData.IsFavorite = false;
			}
		} catch {
			// stays at current state on error
		} finally {
			savingFavorite = false;
		}
	}

	let imgFailed = $state(false);

	async function handleDelete() {
		try {
			await deleteItem(video.Id);
			deleted = true;
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Delete failed';
		}
	}
</script>

{#if !deleted}
<div class="group relative overflow-hidden rounded-2xl border border-border/40 bg-surface-1 transition-all duration-300 hover:border-border-hover hover:shadow-xl hover:shadow-black/20"
	class:opacity-50={played && !loadingUserData}
>
	<button
		onclick={() => onplay(video)}
		class="relative block aspect-video w-full cursor-pointer overflow-hidden bg-surface-2"
	>
		{#if imageUrl && !imgFailed}
			<img src={imageUrl} alt={video.Name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onerror={() => (imgFailed = true)} />
		{:else}
			<div class="flex h-full items-center justify-center">
				<svg class="h-10 w-10 text-text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
		{/if}

		<div class="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/40">
			<div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-75">
				<svg class="ml-0.5 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			</div>
		</div>

		{#if video.RunTimeTicks}
			<span class="absolute bottom-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
				{formatDuration(video.RunTimeTicks)}
			</span>
		{/if}

		{#if progressPercent > 0}
			<div class="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
				<div class="h-full transition-all duration-300 {played ? 'bg-success' : 'bg-accent'}" style="width: {progressPercent}%"></div>
			</div>
		{/if}
	</button>

	{#if playError}
		<div class="mx-4 mt-3 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[11px] text-danger">
			{playError}
		</div>
	{/if}

	<div class="flex items-start gap-1.5 p-4">
		<div class="min-w-0 flex-1">
			<h3 class="truncate text-[14px] font-medium text-text-primary">{video.Name}</h3>
			{#if video.SeriesName}
				<p class="mt-0.5 truncate text-[12px] text-text-muted">{video.SeriesName}</p>
			{/if}
		</div>

		{#if loadingUserData}
			<div class="flex gap-1">
				<div class="h-[30px] w-[30px] animate-pulse rounded-lg bg-surface-3"></div>
				<div class="h-[30px] w-[30px] animate-pulse rounded-lg bg-surface-3"></div>
				<div class="h-[30px] w-[30px] animate-pulse rounded-lg bg-surface-3"></div>
			</div>
		{:else}
			<ActionButton onclick={togglePlayed} title={played ? 'Mark as unplayed' : 'Mark as played'} variant="success" active={played}>
				{#if savingPlayed}
					<svg class="h-[18px] w-[18px] animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
				{:else if played}
					<svg class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
					</svg>
				{:else}
					<svg class="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="4" />
					</svg>
				{/if}
			</ActionButton>

			<ActionButton onclick={toggleFavorite} title={favorite ? 'Remove from favorites' : 'Add to favorites'} variant="favorite" active={favorite}>
				{#if savingFavorite}
					<svg class="h-[18px] w-[18px] animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
				{:else}
					<svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
					</svg>
				{/if}
			</ActionButton>

			<ActionButton onclick={() => (showConfirmDelete = true)} title="Delete video" variant="danger">
				<svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</ActionButton>
		{/if}
	</div>

	{#if showConfirmDelete}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-surface-0/90 backdrop-blur-sm p-4">
			<div class="text-center">
				{#if deleteError}
					<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
						<svg class="h-5 w-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01" />
						</svg>
					</div>
					<p class="mb-3 text-[12px] leading-relaxed text-danger">{deleteError}</p>
					<button
						onclick={() => { showConfirmDelete = false; deleteError = ''; }}
						class="rounded-lg bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-2"
					>
						Close
					</button>
				{:else}
					<p class="mb-1 text-[13px] font-semibold text-text-primary">Delete this video?</p>
					<p class="mb-4 text-[11px] text-text-muted">This cannot be undone</p>
					<div class="flex justify-center gap-2">
						<button
							onclick={() => (showConfirmDelete = false)}
							class="rounded-lg bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-2"
						>
							Cancel
						</button>
						<button
							onclick={handleDelete}
							class="rounded-lg bg-danger px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-danger/80"
						>
							Delete
						</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
{/if}
