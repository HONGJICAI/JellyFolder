# JellyFolder

A folder-focused video browser for [Jellyfin](https://jellyfin.org/) media servers. Built for quickly tracking unread/unwatched videos across folder hierarchies.

## Why

Jellyfin's default web UI organizes media by metadata (movies, series, etc.). JellyFolder organizes by **folder structure** — showing unplayed video counts per folder so you can quickly find and work through content.

## Tech Stack

- **SvelteKit** (SPA mode, adapter-static)
- **Svelte 5** (runes mode)
- **Tailwind CSS v4**
- **TypeScript**
- **pnpm**

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Install & Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173 and connect to your Jellyfin server.

### Build

```sh
pnpm build
```

Output is in `build/` — a static SPA you can host anywhere.

### Type Check

```sh
pnpm check
```

## Performance Notes

JellyFolder uses a two-phase loading strategy to work around slow Jellyfin API responses:

1. **Phase 1** (~10ms): Fetch folder contents without UserData (`EnableUserData=false`) — items appear instantly
2. **Phase 2** (~1-4s): Fetch video UserData and unplayed counts asynchronously — played status, progress bars, and folder badges fill in

For leaf folders (videos only, no subfolders), Phase 2 uses the fast `Ids` endpoint (~60ms) instead of recursive queries.

## Project Structure

```
src/
  routes/
    +layout.svelte              # Auth guard, navbar
    login/+page.svelte          # Login with saved servers
    libraries/+page.svelte      # Library grid
    browse/[folderId]/+page.svelte  # Folder browsing (core page)
  lib/
    api/
      client.ts                 # Jellyfin API client
      types.ts                  # TypeScript interfaces
    components/
      ActionButton.svelte       # Reusable icon button
      SectionHeader.svelte      # Collapsible section
      FolderCard.svelte         # Folder with unplayed badge
      VideoCard.svelte          # Video with played/favorite/delete
      VideoPlayer.svelte        # HTML5 video player
      VideoPlayerOverlay.svelte # Full-screen player overlay
      Breadcrumb.svelte         # Navigation breadcrumbs
      LibraryCard.svelte        # Library selection card
    stores/
      auth.ts                   # Session store (localStorage)
      breadcrumbs.ts            # Navigation path (sessionStorage)
    utils/
      format.ts                 # Duration/time formatting
```

## License

MIT
