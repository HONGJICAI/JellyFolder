<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		count,
		collapsed = $bindable(false),
		children
	}: {
		title: string;
		count: string | number;
		collapsed: boolean;
		children: Snippet;
	} = $props();
</script>

<section class:mb-10={!collapsed}>
	<div class="mb-4 flex items-center gap-2.5">
		<button
			onclick={() => (collapsed = !collapsed)}
			class="flex items-center gap-2.5 group cursor-pointer"
		>
			<svg
				class="h-4 w-4 text-text-muted transition-transform duration-200 {collapsed ? '-rotate-90' : ''}"
				fill="none" stroke="currentColor" viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
			<h2 class="font-display text-xl text-text-primary tracking-wide group-hover:text-accent transition-colors">{title}</h2>
			<span class="text-[13px] text-text-muted">{count}</span>
		</button>
	</div>
	{#if !collapsed}
		{@render children()}
	{/if}
</section>
