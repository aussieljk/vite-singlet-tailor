import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { Plugin } from 'vite'

export interface SingletTailorOptions {
  /** Output directory for singlet files. Default: "./singlets" */
  outDir?: string
  /** Path to CSS file for Tailwind CDN mode. Default: "./src/index.css" */
  cssPath?: string
  /** Use Tailwind CDN instead of compiled CSS. Default: false (or set env TW_CDN) */
  useCdn?: boolean
  /** Embed source code as base64 zip. Default: true */
  embedSource?: boolean
  /** Auto-number output files (1.html, 2.html, etc). Default: true */
  numberedOutput?: boolean
  /** Files to exclude from source embed. Default: ["bun.lock", "package-lock.json", "yarn.lock"] */
  excludeFiles?: string[]
  /** Additional files to include in source embed (useful for gitignored files). Default: [".env", ".env.local", ".env.example"] */
  includeFiles?: string[]
}

const CDN_SCRIPT = `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`

function getTimestamp(): string {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${hours}:${minutes}:${seconds} ${ampm}`
}

function log(msg: string) {
  console.log(`${dim(getTimestamp())} ${green('[singlet-tailor]')} ${msg}`)
}

export function tailwindCdn(options: { outDir: string; cssPath: string }): Plugin {
  return {
    name: 'singlet-tailor:tailwind-cdn',
    closeBundle() {
      const htmlPath = path.join(options.outDir, 'index.html')
      if (!fs.existsSync(htmlPath)) return

      let html = fs.readFileSync(htmlPath, 'utf-8')

      html = html.replace(
        /<style\s+rel="stylesheet"[^>]*>[\s\S]*?<\/style>/g,
        ''
      )

      let customCss = ''
      if (fs.existsSync(options.cssPath)) {
        customCss = fs.readFileSync(options.cssPath, 'utf-8')
          .replace(/^@import\s+["']tailwindcss["'];?\s*/m, '')
          .trim()
      }

      const injection = [
        CDN_SCRIPT,
        `<style type="text/tailwindcss">`,
        customCss,
        `</style>`,
      ].join('\n')

      html = html.replace('</head>', `${injection}\n</head>`)
      fs.writeFileSync(htmlPath, html)
      log('Replaced compiled CSS with Tailwind CDN')
    },
  }
}

export function embedSource(options: {
  outDir: string
  rootDir: string
  excludeFiles: string[]
  includeFiles: string[]
}): Plugin {
  return {
    name: 'singlet-tailor:embed-source',
    closeBundle() {
      const htmlPath = path.join(options.outDir, 'index.html')
      if (!fs.existsSync(htmlPath)) return

      const zipPath = path.join(options.outDir, '.source.zip')
      const outDirRel = path.relative(options.rootDir, options.outDir)

      let files: string[]
      try {
        files = execSync('git ls-files', { cwd: options.rootDir, encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(f => f && !f.startsWith(outDirRel + '/') && !options.excludeFiles.includes(f))
      } catch {
        log('Not a git repo, skipping source embed')
        return
      }

      for (const file of options.includeFiles) {
        if (fs.existsSync(path.join(options.rootDir, file)) && !files.includes(file)) {
          files.push(file)
        }
      }

      if (files.length === 0) {
        log('No files to embed')
        return
      }

      execSync(`zip -q "${zipPath}" ${files.map(f => `"${f}"`).join(' ')}`, { cwd: options.rootDir })

      const b64 = fs.readFileSync(zipPath).toString('base64')
      fs.unlinkSync(zipPath)

      const dirName = path.basename(options.rootDir)
      const existing = fs.readdirSync(options.outDir)
        .filter(f => /^\d+\.html$/.test(f))
        .map(f => parseInt(f))
      const nextNum = existing.length ? Math.max(...existing) + 1 : 1
      const zipName = `${dirName}-${nextNum}.zip`

      const downloadScript = `<script>
(function(){
  function dl(){
    if(location.hash!=="#source")return;
    var s=document.getElementById("source");
    if(!s)return;
    var b=atob(s.textContent),a=new Uint8Array(b.length);
    for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
    var url=URL.createObjectURL(new Blob([a],{type:"application/zip"}));
    var l=document.createElement("a");l.href=url;l.download="${zipName}";
    document.body.appendChild(l);l.click();l.remove();URL.revokeObjectURL(url);
    history.replaceState(null,"",location.pathname);
  }
  window.addEventListener("hashchange",dl);dl();
})();
</script>`

      let html = fs.readFileSync(htmlPath, 'utf-8')
      html = html.replace(
        '</head>',
        `<script type="application/zip" id="source">${b64}</script>\n${downloadScript}\n</head>`
      )
      fs.writeFileSync(htmlPath, html)
      log(`Embedded ${files.length} source files (download via #source)`)
    },
  }
}

export function numberedOutput(options: { outDir: string }): Plugin {
  return {
    name: 'singlet-tailor:numbered-output',
    closeBundle() {
      const src = path.join(options.outDir, 'index.html')
      if (!fs.existsSync(src)) return

      const existing = fs.readdirSync(options.outDir)
        .filter(f => /^\d+\.html$/.test(f))
        .map(f => parseInt(f))
      const next = existing.length ? Math.max(...existing) + 1 : 1

      fs.renameSync(src, path.join(options.outDir, `${next}.html`))
      log(`Output: ${path.basename(options.outDir)}/${next}.html`)
    },
  }
}

export function singletTailor(options: SingletTailorOptions = {}): Plugin[] {
  const rootDir = process.cwd()
  const outDir = path.resolve(rootDir, options.outDir ?? './singlets')
  const cssPath = path.resolve(rootDir, options.cssPath ?? './src/index.css')
  const useCdn = options.useCdn ?? process.env.TW_CDN !== undefined
  const doEmbedSource = options.embedSource ?? true
  const doNumberedOutput = options.numberedOutput ?? true
  const excludeFiles = options.excludeFiles ?? ['bun.lock', 'package-lock.json', 'yarn.lock']
  const includeFiles = options.includeFiles ?? ['.env', '.env.local', '.env.example']

  const plugins: Plugin[] = []

  if (useCdn) {
    plugins.push(tailwindCdn({ outDir, cssPath }))
  }

  if (doEmbedSource) {
    plugins.push(embedSource({ outDir, rootDir, excludeFiles, includeFiles }))
  }

  if (doNumberedOutput) {
    plugins.push(numberedOutput({ outDir }))
  }

  return plugins
}

export default singletTailor
