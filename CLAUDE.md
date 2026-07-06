# vite-singlet-tailor

Vite plugin suite for creating shareable single-file HTML bundles.

## Structure

- `src/index.ts` - Main plugin, exports `singletTailor()` and sub-plugins

## Sub-Plugins

1. **tailwindCdn** - Replaces compiled CSS with Tailwind CDN script
2. **embedSource** - Bundles git-tracked source as base64 zip in HTML
3. **numberedOutput** - Renames `index.html` to `1.html`, `2.html`, etc.

## Key Behavior

- All plugins run in `closeBundle` hook (after vite-plugin-singlefile)
- Source embed uses `git ls-files` to determine included files
- Download via `#source` hash triggers zip download in browser

## Dependencies

- Requires `vite-plugin-singlefile` as peer dependency
- Uses native `zip` command for source bundling

## Build

```bash
bun run build
```
