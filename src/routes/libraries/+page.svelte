<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { session, logout } from '$lib/stores/auth';
	import { JellyfinClient } from '$lib/api/client';
	import type { BaseItemDto } from '$lib/api/types';
	import LibraryCard from '$lib/components/LibraryCard.svelte';

	let libraries: BaseItemDto[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		if (!$session) return;
		const client = new JellyfinClient($session);
		try {
			const views = await client.getViews();
			libraries = views.Items;
		} catch (err) {
			if (err instanceof Error && err.message.includes('401')) {
				logout();
				goto('/login');
				return;
			}
			error = err instanceof Error ? err.message : 'Failed to load libraries';
		} finally {
			loading = false;
		}
	});
</script>

<div class="mx-auto max-w-7xl px-5 pt-8 pb-12">
	<div class="mb-8">
		<h1 class="font-display text-3xl text-text-primary tracking-wide">Your Libraries</h1>
		<p class="mt-1.5 text-[15px] text-text-muted">Choose a library to browse</p>
	</div>

	{#if loading}
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each Array(4) as _}
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
		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each libraries as library, i (library.Id)}
				<div style="animation: fadeSlideUp 0.4s ease both; animation-delay: {i * 60}ms">
					<LibraryCard {library} serverUrl={$session?.serverUrl ?? ''} />
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	@keyframes fadeSlideUp {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
