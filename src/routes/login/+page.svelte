<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { login } from '$lib/stores/auth';

	const SAVED_KEY = 'jf_saved_logins';

	interface SavedLogin {
		serverUrl: string;
		username: string;
		password: string;
	}

	let serverUrl = $state('https://demo.jellyfin.org/stable');
	let username = $state('demo');
	let password = $state('');
	let rememberMe = $state(false);
	let error = $state('');
	let loading = $state(false);
	let savedLogins: SavedLogin[] = $state([]);

	onMount(() => {
		const raw = localStorage.getItem(SAVED_KEY);
		if (raw) {
			try {
				savedLogins = JSON.parse(raw);
				// Auto-fill the most recent saved login
				if (savedLogins.length > 0) {
					const last = savedLogins[0];
					serverUrl = last.serverUrl;
					username = last.username;
					password = last.password;
					rememberMe = true;
				}
			} catch { /* ignore */ }
		}
	});

	function saveLogin(url: string, user: string, pass: string) {
		// Remove duplicate if exists
		savedLogins = savedLogins.filter(
			(s) => !(s.serverUrl === url && s.username === user)
		);
		// Add to front
		savedLogins.unshift({ serverUrl: url, username: user, password: pass });
		// Keep max 5
		savedLogins = savedLogins.slice(0, 5);
		localStorage.setItem(SAVED_KEY, JSON.stringify(savedLogins));
	}

	function removeSavedLogin(index: number) {
		savedLogins.splice(index, 1);
		savedLogins = [...savedLogins];
		localStorage.setItem(SAVED_KEY, JSON.stringify(savedLogins));
	}

	function selectSavedLogin(saved: SavedLogin) {
		serverUrl = saved.serverUrl;
		username = saved.username;
		password = saved.password;
		rememberMe = true;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const cleanUrl = serverUrl.replace(/\/+$/, '');
			await login(cleanUrl, username, password);
			if (rememberMe) {
				saveLogin(cleanUrl, username, password);
			}
			goto('/libraries');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Authentication failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<div class="pointer-events-none fixed left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]"></div>

	<div class="relative w-full max-w-[420px]">
		<div class="mb-10 text-center">
			<div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim border border-accent/20">
				<svg class="h-7 w-7 text-accent" fill="currentColor" viewBox="0 0 24 24">
					<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
				</svg>
			</div>
			<h1 class="font-display text-4xl text-text-primary tracking-wide">JellyFolder</h1>
			<p class="mt-2 text-[15px] text-text-muted">Connect to your Jellyfin server</p>
		</div>

		<!-- Saved logins -->
		{#if savedLogins.length > 0}
			<div class="mb-6">
				<p class="mb-2.5 text-[13px] font-medium tracking-wide uppercase text-text-muted">Saved Servers</p>
				<div class="space-y-2">
					{#each savedLogins as saved, i (saved.serverUrl + saved.username)}
						<div class="flex items-center gap-2">
							<button
								onclick={() => selectSavedLogin(saved)}
								class="flex-1 flex items-center gap-3 rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-surface-2"
							>
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-text-muted">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
									</svg>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate text-[14px] font-medium text-text-primary">{saved.username}</p>
									<p class="truncate text-[12px] text-text-muted">{saved.serverUrl}</p>
								</div>
							</button>
							<button
								onclick={() => removeSavedLogin(i)}
								title="Remove saved login"
								class="rounded-lg p-2 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mb-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[14px] text-danger">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-5">
			<div>
				<label for="serverUrl" class="mb-2 block text-[13px] font-medium tracking-wide uppercase text-text-muted">Server URL</label>
				<input
					type="url"
					id="serverUrl"
					bind:value={serverUrl}
					placeholder="https://your-server.com"
					required
					class="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder-text-muted/50 transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30 focus:outline-none"
				/>
			</div>

			<div>
				<label for="username" class="mb-2 block text-[13px] font-medium tracking-wide uppercase text-text-muted">Username</label>
				<input
					type="text"
					id="username"
					bind:value={username}
					required
					class="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder-text-muted/50 transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30 focus:outline-none"
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-[13px] font-medium tracking-wide uppercase text-text-muted">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="Leave empty if none"
					class="w-full rounded-xl border border-border bg-surface-1 px-4 py-3 text-[15px] text-text-primary placeholder-text-muted/50 transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/30 focus:outline-none"
				/>
			</div>

			<!-- Remember me -->
			<label class="flex items-center gap-2.5 cursor-pointer">
				<div class="relative">
					<input type="checkbox" bind:checked={rememberMe} class="peer sr-only" />
					<div class="h-5 w-9 rounded-full bg-surface-3 transition-colors peer-checked:bg-accent"></div>
					<div class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></div>
				</div>
				<span class="text-[14px] text-text-secondary">Remember login</span>
			</label>

			<button
				type="submit"
				disabled={loading}
				class="group relative w-full overflow-hidden rounded-xl bg-accent px-4 py-3.5 text-[15px] font-semibold text-surface-0 transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface-0 focus:outline-none active:scale-[0.98] disabled:opacity-50"
			>
				{loading ? 'Connecting...' : 'Connect'}
			</button>
		</form>
	</div>
</div>
