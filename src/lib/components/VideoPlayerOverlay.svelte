<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/auth';
	import { JellyfinClient } from '$lib/api/client';
	import type { BaseItemDto } from '$lib/api/types';
	import { formatDuration } from '$lib/utils/format';
	import VideoPlayer from './VideoPlayer.svelte';

	let {
		video,
		onclose
	}: {
		video: BaseItemDto;
		onclose: () => void;
	} = $props();

	let streamUrl = $state('');
	let mediaSourceId = $state('');
	let playSessionId = $state('');
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!$session) return;
		const client = new JellyfinClient($session);
		try {
			const playbackInfo = await client.getPlaybackInfo(video.Id);
			const mediaSource = playbackInfo.MediaSources[0];
			const container = mediaSource?.Container?.toLowerCase() || 'mp4';
			streamUrl = client.streamUrl(video.Id, container);
			mediaSourceId = mediaSource?.Id ?? video.Id;
			playSessionId = playbackInfo.PlaySessionId;
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load video';
			loading = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="fixed inset-0 z-50 flex flex-col bg-surface-0">
	<div class="absolute top-0 right-0 left-0 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-5">
		<div class="flex items-center gap-4">
			<button
				onclick={onclose}
				title="Close player"
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-[16px] font-semibold text-white">{video.Name}</h1>
				{#if video.SeriesName}
					<p class="truncate text-[13px] text-white/50">{video.SeriesName}</p>
				{/if}
			</div>
			{#if video.RunTimeTicks}
				<span class="text-[13px] font-medium text-white/40">{formatDuration(video.RunTimeTicks)}</span>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<div class="text-center">
				<div class="mx-auto mb-5 h-16 w-16 animate-pulse rounded-2xl bg-surface-2 flex items-center justify-center">
					<svg class="h-8 w-8 text-text-muted/30" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>
				<p class="text-[14px] text-text-muted">Loading video...</p>
			</div>
		</div>
	{:else if error}
		<div class="flex flex-1 items-center justify-center">
			<div class="max-w-sm rounded-2xl border border-danger/20 bg-surface-1 p-8 text-center">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
					<svg class="h-6 w-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
				</div>
				<p class="text-[15px] text-text-primary">{error}</p>
				<button
					onclick={onclose}
					class="mt-5 rounded-xl bg-surface-2 px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:bg-surface-3"
				>
					Close
				</button>
			</div>
		</div>
	{:else}
		<VideoPlayer
			{streamUrl}
			itemId={video.Id}
			{mediaSourceId}
			{playSessionId}
			resumePositionTicks={video.UserData?.PlaybackPositionTicks ?? 0}
		/>
	{/if}
</div>
