<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onclick,
		title,
		active = false,
		variant = 'default',
		children
	}: {
		onclick: (e: Event) => void;
		title: string;
		active?: boolean;
		variant?: 'default' | 'success' | 'danger' | 'favorite';
		children: Snippet;
	} = $props();

	let classes = $derived(() => {
		switch (variant) {
			case 'success':
				return active
					? 'bg-success-dim text-success hover:bg-success/20'
					: 'text-text-muted hover:bg-surface-3 hover:text-text-secondary';
			case 'danger':
				return 'text-text-muted hover:bg-danger/10 hover:text-danger';
			case 'favorite':
				return active
					? 'text-red-400 hover:text-red-300'
					: 'text-text-muted hover:bg-surface-3 hover:text-text-secondary';
			default:
				return active
					? 'bg-accent-dim text-accent hover:bg-accent/20'
					: 'text-text-muted hover:bg-surface-3 hover:text-text-secondary';
		}
	});
</script>

<button
	{onclick}
	{title}
	class="flex-shrink-0 rounded-lg p-1.5 transition-all duration-200 {classes()}"
>
	{@render children()}
</button>
