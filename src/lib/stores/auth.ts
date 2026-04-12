import { writable } from 'svelte/store';
import type { SessionInfo } from '$lib/api/types';
import { authenticate } from '$lib/api/client';

const STORAGE_KEY = 'jf_session';

function loadSession(): SessionInfo | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as SessionInfo;
	} catch {
		return null;
	}
}

function saveSession(s: SessionInfo | null) {
	if (typeof localStorage === 'undefined') return;
	if (s) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
	} else {
		localStorage.removeItem(STORAGE_KEY);
	}
}

export const session = writable<SessionInfo | null>(loadSession());

// Keep localStorage in sync
session.subscribe((value) => {
	saveSession(value);
});

export async function login(serverUrl: string, username: string, password: string) {
	const result = await authenticate(serverUrl, username, password);
	const info: SessionInfo = {
		serverUrl,
		token: result.AccessToken,
		userId: result.User.Id,
		username: result.User.Name
	};
	session.set(info);
	return info;
}

export function logout() {
	session.set(null);
}
