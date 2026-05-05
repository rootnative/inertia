import { execSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const docsDir = resolve(here, '..')
const exampleDir = resolve(docsDir, '..', 'example')
const distDir = resolve(exampleDir, 'dist')
const outDir = resolve(docsDir, 'static', 'example')

const force = process.argv.includes('--force')

if (!force && existsSync(outDir)) {
  console.log(
    '[prepare-demo] static/example exists — skipping export (use --force to rebuild).',
  )
  process.exit(0)
}

console.log('[prepare-demo] exporting example app for web…')
execSync('npx expo export --platform web', {
  cwd: exampleDir,
  stdio: 'inherit',
})

if (!existsSync(distDir)) {
  console.error('[prepare-demo] expected example/dist after export, not found.')
  process.exit(1)
}

console.log('[prepare-demo] copying example/dist → docs/static/example…')
rmSync(outDir, { recursive: true, force: true })
cpSync(distDir, outDir, { recursive: true })
console.log('[prepare-demo] done.')
