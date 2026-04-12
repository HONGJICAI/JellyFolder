# CLAUDE.md

## Project

JellyFolder — a folder-focused Jellyfin video browser (SPA). SvelteKit + Svelte 5 + Tailwind CSS v4 + TypeScript.

## Commands

- `pnpm dev` — start dev server
- `pnpm check` — type check (svelte-check + TypeScript)
- `pnpm build` — production build (static SPA)
- `npx tsx scripts/profile-api.ts` — profile Jellyfin API performance

## Code Principles

- Code should be efficient and clean. Avoid unnecessary abstractions.
- Every network request must have a visible loading state (skeleton, spinner, or shimmer). Never leave the user staring at a blank screen.
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`). No legacy Svelte 4 syntax.
- Profile before optimizing — use the scripts in `scripts/` to measure actual API performance before changing query strategies.