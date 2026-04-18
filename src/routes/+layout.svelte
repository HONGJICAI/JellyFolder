<script lang="ts">
	import '../app.css';
	import '$lib/demo-init';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { session, logout } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let { children }: { children: any } = $props();

	const DEMO = import.meta.env.MODE === 'demo';
	let swReady = $state(!DEMO);

	onMount(() => {
		if (!DEMO || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
			swReady = true;
			return;
		}
		if (navigator.serviceWorker.controller) {
			sessionStorage.removeItem('jf_sw_reload');
			swReady = true;
			return;
		}

		// No controller on this page load. Two possible causes:
		//   1. First visit — SW is installing. Wait for `controllerchange`.
		//   2. Hard refresh (Ctrl+Shift+R) — Chrome bypassed the SW for this navigation
		//      even though an active registration exists. `controllerchange` will not
		//      fire. Recovery: trigger one normal reload, which goes through the SW.
		(async () => {
			const reg = await navigator.serviceWorker.getRegistration();
			if (reg?.active && !sessionStorage.getItem('jf_sw_reload')) {
				sessionStorage.setItem('jf_sw_reload', '1');
				window.location.reload();
				return;
			}

			const onChange = () => {
				if (navigator.serviceWorker.controller) {
					sessionStorage.removeItem('jf_sw_reload');
					swReady = true;
				}
			};
			navigator.serviceWorker.addEventListener('controllerchange', onChange);
			// Safety net: don't hang forever if SW fails to claim.
			setTimeout(() => (swReady = true), 3000);
		})();
	});

	let currentPath = $derived($page.url.pathname);
	let isLoginPage = $derived(currentPath === '/login');

	$effect(() => {
		if (!$session && !isLoginPage) {
			goto('/login');
		}
	});

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>JellyFolder</title>
</svelte:head>

{#if !swReady}
	<div class="flex min-h-screen items-center justify-center">
		<div class="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
	</div>
{:else if $session && !isLoginPage}
	<nav class="sticky top-0 z-40 border-b border-border/60 bg-surface-0/80 backdrop-blur-xl">
		<div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
			<a href="/libraries" class="group flex items-center gap-2.5">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim">
					<svg class="h-4 w-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
						<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
				</div>
				<span class="font-display text-xl text-text-primary tracking-wide">JellyFolder</span>
			</a>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-1.5">
					<div class="h-1.5 w-1.5 rounded-full bg-success"></div>
					<span class="text-[13px] font-medium text-text-secondary">{$session.username}</span>
				</div>
				<button
					onclick={handleLogout}
					class="rounded-lg px-3 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-text-secondary"
				>
					Sign out
				</button>
			</div>
		</div>
	</nav>
{/if}

{#if swReady}
	{@render children()}
{/if}
