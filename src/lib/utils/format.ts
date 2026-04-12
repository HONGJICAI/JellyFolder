const TICKS_PER_SECOND = 10_000_000;

export function formatDuration(ticks?: number): string {
	if (!ticks) return '';
	const totalSeconds = Math.floor(ticks / TICKS_PER_SECOND);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}

export function formatTimestamp(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export function ticksToSeconds(ticks: number): number {
	return ticks / TICKS_PER_SECOND;
}

export function secondsToTicks(seconds: number): number {
	return Math.floor(seconds * TICKS_PER_SECOND);
}
