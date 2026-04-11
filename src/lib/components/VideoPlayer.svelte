<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/auth';
	import { JellyfinClient } from '$lib/api/client';
	import { formatTimestamp, ticksToSeconds, secondsToTicks } from '$lib/utils/format';

	let {
		streamUrl,
		itemId,
		mediaSourceId,
		playSessionId,
		resumePositionTicks = 0
	}: {
		streamUrl: string;
		itemId: string;
		mediaSourceId: string;
		playSessionId: string;
		resumePositionTicks?: number;
	} = $props();

	const VOLUME_KEY = 'jf_volume';

	let videoEl: HTMLVideoElement | undefined = $state();
	let hasReportedStart = $state(false);
	let lastReportTime = $state(0);
	let showResumePrompt = $state(resumePositionTicks > 0);
	let videoError = $state('');

	const resumeSeconds = ticksToSeconds(resumePositionTicks);

	function getClient(): JellyfinClient | null {
		if (!$session) return null;
		return new JellyfinClient($session);
	}

	function killVideo() {
		if (!videoEl) return;
		videoEl.pause();
		videoEl.removeAttribute('src');
		videoEl.load();
	}

	async function reportPlayback(action: string, extra: Record<string, unknown> = {}) {
		const client = getClient();
		if (!client || !videoEl) return;

		const positionTicks = secondsToTicks(videoEl.currentTime);
		console.log('[JellyFolder] reportPlayback:', action, { itemId, positionTicks });

		try {
			switch (action) {
				case 'start':
					await client.reportPlaybackStart({
						ItemId: itemId,
						MediaSourceId: mediaSourceId,
						PlaySessionId: playSessionId,
						CanSeek: true,
						PlayMethod: 'DirectPlay',
						PositionTicks: positionTicks
					});
					break;
				case 'progress':
					await client.reportPlaybackProgress({
						ItemId: itemId,
						MediaSourceId: mediaSourceId,
						PlaySessionId: playSessionId,
						CanSeek: true,
						PlayMethod: 'DirectPlay',
						IsPaused: (extra.isPaused as boolean) ?? false,
						PositionTicks: positionTicks
					});
					break;
				case 'stopped':
					await client.reportPlaybackStopped({
						ItemId: itemId,
						MediaSourceId: mediaSourceId,
						PlaySessionId: playSessionId,
						PositionTicks: positionTicks
					});
					break;
				}
		} catch (err) {
			console.error('[JellyFolder] playback report error:', err);
		}
	}

	function handlePlay() {
		console.log('[JellyFolder] video play event');
		if (!hasReportedStart) {
			hasReportedStart = true;
			reportPlayback('start');
		}
	}

	function handleTimeUpdate() {
		if (!videoEl) return;
		const now = Date.now();
		if (now - lastReportTime > 10_000) {
			lastReportTime = now;
			reportPlayback('progress', { isPaused: false });
		}
	}

	function handlePause() {
		reportPlayback('progress', { isPaused: true });
	}

	function handleEnded() {
		reportPlayback('stopped');
	}

	function handleError() {
		if (videoEl?.error) {
			console.error('[JellyFolder] video error:', videoEl.error.code, videoEl.error.message);
			videoError = 'This video format may not be supported by your browser. Try a different browser or check the video codec.';
		}
	}

	function resumePlayback() {
		showResumePrompt = false;
		if (videoEl) {
			videoEl.currentTime = resumeSeconds;
			videoEl.play();
		}
	}

	function startFromBeginning() {
		showResumePrompt = false;
		if (videoEl) {
			videoEl.play();
		}
	}

	function handleVolumeChange() {
		if (videoEl) {
			localStorage.setItem(VOLUME_KEY, String(videoEl.volume));
		}
	}

	onMount(() => {
		if (videoEl) {
			// Restore saved volume
			const saved = localStorage.getItem(VOLUME_KEY);
			if (saved !== null) {
				videoEl.volume = Math.max(0, Math.min(1, parseFloat(saved)));
			}
			// Auto-play if no resume prompt
			if (!showResumePrompt) {
				videoEl.play().catch(() => {});
			}
		}

		function handleBeforeUnload() {
			// sendBeacon can't set custom headers, so we use the stopped report best-effort
			// In SPA mode the token is in the Authorization header which sendBeacon can't use
			// The progress will already have been reported via the last timeupdate
		}

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			if (videoEl && videoEl.currentTime > 0) {
				reportPlayback('stopped');
			}
			killVideo();
		};
	});
</script>

<div class="relative h-full w-full bg-black">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoEl}
		src={streamUrl}
		class="h-full w-full"
		controls
		preload="metadata"
		onplay={handlePlay}
		ontimeupdate={handleTimeUpdate}
		onpause={handlePause}
		onended={handleEnded}
		onerror={handleError}
		onvolumechange={handleVolumeChange}
	></video>

	{#if showResumePrompt}
		<div class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div class="rounded-2xl border border-border/40 bg-surface-1 p-7 text-center shadow-2xl">
				<p class="mb-1 text-[16px] font-semibold text-text-primary">Resume playback?</p>
				<p class="mb-5 text-[14px] text-text-muted">Continue from {formatTimestamp(resumeSeconds)}</p>
				<div class="flex gap-3">
					<button
						onclick={startFromBeginning}
						class="flex-1 rounded-xl bg-surface-3 px-4 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:bg-surface-3/80"
					>
						Start Over
					</button>
					<button
						onclick={resumePlayback}
						class="flex-1 rounded-xl bg-accent px-4 py-2.5 text-[14px] font-semibold text-surface-0 transition-colors hover:bg-accent-hover"
					>
						Resume
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if videoError}
		<div class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div class="max-w-sm rounded-2xl border border-danger/20 bg-surface-1 p-7 text-center shadow-2xl">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
					<svg class="h-6 w-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
				</div>
				<p class="text-[15px] text-text-primary">{videoError}</p>
			</div>
		</div>
	{/if}
</div>
