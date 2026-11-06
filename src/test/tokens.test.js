import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatHex, interpolate, parse, wcagContrast } from 'culori'
import { describe, expect, it } from 'vitest'
import { THEME_COLORS } from '@/lib/constants'

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

function readBlock(selector) {
  const match = new RegExp(`^${selector.replace('.', '\\.')} \\{([\\s\\S]*?)^\\}`, 'm').exec(css)
  if (!match) throw new Error(`No ${selector} block in index.css`)
  return Object.fromEntries(
    [...match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  )
}

const root = readBlock(':root')
const themes = { light: root, dark: { ...root, ...readBlock('.dark') } }

function resolve(vars, name, depth = 0) {
  const value = vars[name]
  if (value === undefined) throw new Error(`Unknown token --${name}`)
  const ref = /^var\(--([\w-]+)\)$/.exec(value)
  if (ref && depth < 10) return resolve(vars, ref[1], depth + 1)
  return parse(value)
}

/** Text pairs that must reach WCAG AA (4.5:1) in both themes. */
const TEXT_PAIRS = [
  ['foreground', 'background'],
  ['foreground', 'canvas'],
  ['foreground', 'muted'],
  ['foreground', 'accent'],
  ['foreground', 'popover'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'canvas'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'popover'],
  ['subtle-foreground', 'background'],
  ['primary-foreground', 'primary'],
  ['brand-foreground', 'brand'],
  ['destructive-foreground', 'destructive'],
  ['brand', 'background'],
  ['success', 'background'],
  ['warning', 'background'],
  ['destructive', 'background'],
]

const TONES = ['brand', 'success', 'warning', 'destructive']

describe.each(Object.entries(themes))('%s theme tokens', (theme, vars) => {
  it.each(TEXT_PAIRS)('%s on %s meets 4.5:1', (text, surface) => {
    expect(wcagContrast(resolve(vars, text), resolve(vars, surface))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(TONES)('%s badge text on its tinted fill meets 4.5:1', (tone) => {
    const surface = resolve(vars, 'background')
    const color = resolve(vars, tone)
    const tint = interpolate([surface, color], 'oklab')(0.1)
    expect(wcagContrast(color, tint)).toBeGreaterThanOrEqual(4.5)
  })

  it('theme-color meta matches the canvas token', () => {
    expect(formatHex(resolve(vars, 'canvas'))).toBe(THEME_COLORS[theme])
  })
})
