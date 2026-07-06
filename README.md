# vite-singlet-tailor

Bundle Vite apps into single HTML files with embedded source code, optional Tailwind CDN, and auto-numbered output.

Perfect for creating shareable prototypes, design iterations, or archiving app versions.

## Install

```bash
bun add -D vite-singlet-tailor vite-plugin-singlefile
```

## Requirements

The source-embed feature shells out to two native tools:

- **`zip`** - used to create the embedded source archive (preinstalled on macOS and most Linux distros)
- **`git`** - your project must be a git repository; `git ls-files` determines which files are embedded (source embed is skipped, with a log message, if it isn't)

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { singletTailor } from 'vite-singlet-tailor';

export default defineConfig({
  build: {
    outDir: './singlets',
  },
  plugins: [
    viteSingleFile(),
    ...singletTailor(),
  ],
});
```

## What It Does

1. **Numbered Output** - Each build creates `1.html`, `2.html`, `3.html`, etc.
2. **Embedded Source** - Full source code bundled as base64 zip, downloadable via `#source` hash
3. **Tailwind CDN** (optional) - Swaps compiled CSS for the Tailwind CDN script at build time

## Downloading Source

Open any generated HTML file and add `#source` to the URL:

```
file:///path/to/singlets/3.html#source
```

This triggers an automatic download of a zip containing the full source code.

## Options

```ts
singletTailor({
  // Output directory for singlet files (default: "./singlets")
  outDir: './singlets',

  // Path to CSS file for Tailwind CDN mode (default: "./src/index.css")
  cssPath: './src/index.css',

  // Use Tailwind CDN instead of compiled CSS (default: false)
  // Also enabled by setting TW_CDN env var
  useCdn: false,

  // Embed source code as base64 zip (default: true)
  embedSource: true,

  // Auto-number output files (default: true)
  numberedOutput: true,

  // Files to exclude from source embed
  excludeFiles: ['bun.lock', 'package-lock.json', 'yarn.lock'],

  // Additional files to include (useful for gitignored files)
  includeFiles: ['.env', '.env.local', '.env.example'],
});
```

## Individual Plugins

You can also use the sub-plugins directly:

```ts
import { tailwindCdn, embedSource, numberedOutput } from 'vite-singlet-tailor';

export default defineConfig({
  plugins: [
    viteSingleFile(),
    tailwindCdn({ outDir: './singlets', cssPath: './src/index.css' }),
    embedSource({ outDir: './singlets', rootDir: process.cwd(), excludeFiles: [], includeFiles: [] }),
    numberedOutput({ outDir: './singlets' }),
  ],
});
```

## Tailwind CDN Mode

Enable with `useCdn: true` or by setting the `TW_CDN` environment variable:

```bash
TW_CDN=1 bun run build
```

This replaces compiled Tailwind CSS with the Tailwind CDN script, useful for quick prototyping without build dependencies.

## License

MIT
