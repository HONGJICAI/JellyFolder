<script lang="ts">
	import { breadcrumbStore, navigateToFolder } from '$lib/stores/breadcrumbs';
</script>

<nav class="flex items-center gap-1.5 text-[14px] flex-wrap">
	<a href="/libraries" class="text-text-muted transition-colors hover:text-accent">Libraries</a>
	{#each $breadcrumbStore as crumb, i (crumb.id)}
		<svg class="h-3.5 w-3.5 text-text-muted/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
		{#if i < $breadcrumbStore.length - 1}
			<a
				href="/browse/{crumb.id}"
				onclick={() => navigateToFolder(crumb.id, crumb.name)}
				class="text-text-muted transition-colors hover:text-accent"
			>{crumb.name}</a>
		{:else}
			<span class="font-medium text-text-primary">{crumb.name}</span>
		{/if}
	{/each}
</nav>
