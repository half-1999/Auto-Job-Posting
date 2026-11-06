#!/usr/bin/env node
// Checks the initial-load budget from docs/DEVELOPMENT_ROADMAP.md §3 against `dist/`.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const BUDGET_KB = { js: 180, css: 25 }

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first.')
  process.exit(1)
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const assets = [
  ...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+\.css)"/g),
].map((match) => match[1])

const totals = { js: 0, css: 0 }
for (const file of new Set(assets)) {
  const kind = file.endsWith('.css') ? 'css' : 'js'
  const size = gzipSync(readFileSync(join(DIST, file))).length / 1024
  totals[kind] += size
  console.log(`${size.toFixed(1).padStart(7)} KB  ${file}`)
}

let failed = false
for (const kind of ['js', 'css']) {
  const ok = totals[kind] <= BUDGET_KB[kind]
  failed ||= !ok
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} initial ${kind}: ${totals[kind].toFixed(1)} KB gzip (budget ${BUDGET_KB[kind]} KB)`,
  )
}
process.exit(failed ? 1 : 0)
