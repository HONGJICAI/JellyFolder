<script lang="ts">
	import { goto } from '$app/navigation';
	import { session } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	onMount(() => {
		goto($session ? '/libraries' : '/login');
	});
</script>
