import { writable, get } from 'svelte/store';

export type Crumb = { id: string; name: string };

const STORAGE_KEY = 'jf_breadcrumbs';

function load(): Crumb[] {
	if (typeof sessionStorage === 'undefined') return [];
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function save(crumbs: Crumb[]) {
	if (typeof sessionStorage === 'undefined') return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(crumbs));
}

export const breadcrumbStore = writable<Crumb[]>(load());

breadcrumbStore.subscribe(save);

export function navigateToFolder(id: string, name: string) {
	const current = get(breadcrumbStore);
	const existingIndex = current.findIndex((c) => c.id === id);

	if (existingIndex >= 0) {
		breadcrumbStore.set(current.slice(0, existingIndex + 1));
	} else {
		breadcrumbStore.set([...current, { id, name }]);
	}
}

export function resetBreadcrumbs() {
	breadcrumbStore.set([]);
}
