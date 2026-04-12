<script lang="ts">
	import type { BaseItemDto } from '$lib/api/types';
	import { navigateToFolder } from '$lib/stores/breadcrumbs';
	import ActionButton from './ActionButton.svelte';

	let {
		folder,
		serverUrl,
		loadingCounts = false,
		markFavorite,
		unmarkFavorite,
		deleteItem
	}: {
		folder: BaseItemDto;
		serverUrl: string;
		loadingCounts?: boolean;
		markFavorite: (id: string) => Promise<void>;
		unmarkFavorite: (id: string) => Promise<void>;
		deleteItem: (id: string) => Promise<void>;
	} = $props();

	let imageUrl = $derived(folder.ImageTags?.Primary
		? `${serverUrl}/Items/${folder.Id}/Images/Primary?maxWidth=300&tag=${folder.ImageTags.Primary}`
		: null);

	let countsReady = $derived(!loadingCounts && folder.UserData?.UnplayedItemCount !== undefined);
	let unplayed = $derived(folder.UserData?.UnplayedItemCount ?? 0);
	let allWatched = $derived(countsReady && unplayed === 0);
	let favorite = $state(folder.UserData?.IsFavorite ?? false);
	let showConfirmDelete = $state(false);
	let deleted = $state(false);
	let deleteError = $state('');

	async function toggleFavorite(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		const was = favorite;
		favorite = !favorite;
		try {
			if (favorite) {
				await markFavorite(folder.Id);
			} else {
				await unmarkFavorite(folder.Id);
			}
		} catch {
			favorite = was;
		}
	}

	function openDeleteConfirm(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		showConfirmDelete = true;
	}

	function cancelDelete(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		showConfirmDelete = false;
		deleteError = '';
	}

	async function handleDelete(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		try {
			await deleteItem(folder.Id);
			deleted = true;
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Delete failed';
		}
	}
</script>

{#if !deleted}
<a
	href="/browse/{folder.Id}"
	onclick={() => navigateToFolder(folder.Id, folder.Name)}
	class="group relative block overflow-hidden rounded-2xl border border-border/40 bg-surface-1 transition-all duration-300 hover:border-border-hover hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5"
>
	<div class="aspect-video w-full overflow-hidden bg-surface-2">
		{#if imageUrl}
			<img src={imageUrl} alt={folder.Name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
		{:else}
			<div class="flex h-full items-center justify-center">
				<svg class="h-10 w-10 text-text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			</div>
		{/if}
	</div>

	<!-- Badges: top-right = unplayed count -->
	{#if loadingCounts}
		<div class="absolute top-3 right-3 h-6 w-10 animate-pulse rounded-full bg-surface-3/80 backdrop-blur-sm"></div>
	{:else if unplayed > 0}
		<div class="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-1 text-[11px] font-bold text-surface-0 shadow-lg shadow-accent/20 backdrop-blur-sm">
			{unplayed}
			<span class="font-medium">new</span>
		</div>
	{:else if allWatched}
		<div class="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-success/90 shadow-lg shadow-success/20 backdrop-blur-sm">
			<svg class="h-3.5 w-3.5 text-surface-0" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
			</svg>
		</div>
	{/if}

	<!-- Top-left: favorite + delete (show on hover) -->
	<div class="absolute top-3 left-3 flex gap-1.5">
		<button
			onclick={toggleFavorite}
			title={favorite ? 'Remove from favorites' : 'Add to favorites'}
			class="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200
				{favorite
				? 'bg-red-500/80 text-white shadow-lg shadow-red-500/20'
				: 'bg-black/30 text-white/60 opacity-0 group-hover:opacity-100 hover:bg-black/50 hover:text-white'}"
		>
			<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
			</svg>
		</button>

		<button
			onclick={openDeleteConfirm}
			title="Delete folder"
			class="flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/60 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-danger/80 hover:text-white"
		>
			<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
			</svg>
		</button>
	</div>

	<div class="p-4">
		<h3 class="truncate text-[15px] font-medium text-text-primary group-hover:text-accent transition-colors duration-200">{folder.Name}</h3>
		<p class="mt-0.5 text-[13px] text-text-muted">
			{#if loadingCounts}
				<span class="inline-block h-3 w-16 animate-pulse rounded bg-surface-3"></span>
			{:else if unplayed > 0}
				{unplayed} unplayed
			{:else if allWatched}
				All watched
			{/if}
		</p>
	</div>

	<!-- Delete confirmation overlay -->
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
						onclick={cancelDelete}
						class="rounded-lg bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-2"
					>
						Close
					</button>
				{:else}
					<p class="mb-1 text-[13px] font-semibold text-text-primary">Delete this folder?</p>
					<p class="mb-4 text-[11px] text-text-muted">All contents will be deleted</p>
					<div class="flex justify-center gap-2">
						<button
							onclick={cancelDelete}
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
</a>
{/if}
