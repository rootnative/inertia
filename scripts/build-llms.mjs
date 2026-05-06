#!/usr/bin/env node
/**
 * Build the llms.txt documentation files.
 *
 * Two outputs from one source of truth:
 *
 * - `docs/static/llms.txt`             — hand-curated, concise. Source of truth.
 * - `packages/core/llms.txt`           — copy of the above, ships with npm so
 *                                         downstream tooling reading from
 *                                         `node_modules` picks up the same
 *                                         overview.
 * - `docs/static/llms-full.txt`        — auto-generated from the docs/docs/*.md
 *                                         page set, in sidebar order. Mirrors
 *                                         the rendered docs site so both
 *                                         surfaces stay in sync.
 *
 * Run via `pnpm build:llms`. Re-run after editing any markdown page in
 * `docs/docs/` or after the public API changes.
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const docsDir = join(repoRoot, 'docs')
const docsContentDir = join(docsDir, 'docs')
const staticDir = join(docsDir, 'static')
const corePkgDir = join(repoRoot, 'packages', 'core')

// Doc page order — mirrors docs/sidebars.ts. Keep in sync when adding pages.
// Entries are doc IDs relative to docs/docs/, no extension.
const PAGES = [
  'index',
  'installation',
  'primitives/index',
  'primitives/view',
  'primitives/text',
  'primitives/image',
  'primitives/pressable',
  'primitives/scroll-view',
  'transitions',
  'sequences',
  'variants',
  'gestures',
  'presence',
  'motion-config',
  'perf-bench',
  'api/hooks',
  'api/create-motion-component',
]

// Strip the leading YAML frontmatter block (--- … ---) from a markdown page.
function stripFrontmatter(md) {
  if (!md.startsWith('---')) return md
  const end = md.indexOf('\n---', 3)
  if (end === -1) return md
  // Skip past the closing fence and the newline that follows it.
  const after = md.indexOf('\n', end + 4)
  return after === -1 ? '' : md.slice(after + 1)
}

function buildLlmsFull() {
  const sections = PAGES.map((id) => {
    const path = join(docsContentDir, `${id}.md`)
    const raw = readFileSync(path, 'utf8')
    return stripFrontmatter(raw).trimEnd()
  })

  const header = [
    '# Inertia — full API reference',
    '',
    '> This file aggregates every documentation page in source order. Generated from docs/docs/*.md by scripts/build-llms.mjs — do not edit by hand.',
    '',
    `> Source: https://github.com/onlynative/inertia`,
    `> Site:   https://onlynative.github.io/inertia/`,
    '',
    '---',
    '',
  ].join('\n')

  const body = sections.join('\n\n---\n\n')
  return header + body + '\n'
}

const llmsTxtPath = join(staticDir, 'llms.txt')
const llmsFullPath = join(staticDir, 'llms-full.txt')
const corePackageLlmsPath = join(corePkgDir, 'llms.txt')

console.log('[build-llms] writing docs/static/llms-full.txt …')
writeFileSync(llmsFullPath, buildLlmsFull())

console.log(
  '[build-llms] copying docs/static/llms.txt → packages/core/llms.txt …',
)
copyFileSync(llmsTxtPath, corePackageLlmsPath)

console.log('[build-llms] done.')
