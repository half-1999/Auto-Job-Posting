#!/usr/bin/env node
// Fails when UI source contains an em dash or en dash (docs/UI_UX_PLAN.md §9).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../src/', import.meta.url))
const BANNED = /[\u2013\u2014]/
const EXTENSIONS = /\.(jsx?|html)$/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : EXTENSIONS.test(name) ? [path] : []
  })
}

const problems = []
for (const file of walk(ROOT)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      if (BANNED.test(line)) problems.push(`${relative(ROOT, file)}:${index + 1}  ${line.trim()}`)
    })
}

if (problems.length) {
  console.error('Em dash or en dash found. Use a period, comma, colon, or parentheses instead:\n')
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log('lint:copy passed')
