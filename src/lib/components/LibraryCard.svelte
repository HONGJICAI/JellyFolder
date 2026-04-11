<script lang="ts">
	import type { BaseItemDto } from '$lib/api/types';
	import { resetBreadcrumbs, navigateToFolder } from '$lib/stores/breadcrumbs';

	let { library, serverUrl }: { library: BaseItemDto; serverUrl: string } = $props();

	let imageUrl = $derived(library.ImageTags?.Primary
		? `${serverUrl}/Items/${library.Id}/Images/Primary?maxWidth=400&tag=${library.ImageTags.Primary}`
		: null);
</script>

<a
	href="/browse/{library.Id}"
	onclick={() => { resetBreadcrumbs(); navigateToFolder(library.Id, library.Name); }}
	class="group relative block overflow-hidden rounded-2xl border border-border/40 bg-surface-1 transition-all duration-300 hover:border-border-hover hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5"
>
	<div class="aspect-video w-full overflow-hidden bg-surface-2">
		{#if imageUrl}
			<img src={imageUrl} alt={library.Name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
		{:else}
			<div class="flex h-full items-center justify-center">
				<svg class="h-12 w-12 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			</div>
		{/if}
		<div class="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
	</div>
	<div class="p-4">
		<h2 class="text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors duration-200">{library.Name}</h2>
		{#if library.CollectionType}
			<p class="mt-0.5 text-[13px] text-text-muted capitalize">{library.CollectionType}</p>
		{/if}
	</div>
</a>
