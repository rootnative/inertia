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
 * - `packages/<sibling>/llms.txt`      — per-package slice for each optional
 *                                         adapter (gestures, gradients, svg).
 *                                         Auto-generated from the matching
 *                                         doc page so the npm tarball ships a
 *                                         self-contained reference.
 * - `docs/static/llms-full.txt`        — auto-generated from the
 *                                         docs/docs/*.{md,mdx} page set, in
 *                                         sidebar order. Mirrors the rendered
 *                                         docs site so both surfaces stay in
 *                                         sync.
 *
 * Run via `pnpm build:llms`. Re-run after editing any markdown page in
 * `docs/docs/` or after the public API changes.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const docsDir = join(repoRoot, 'docs')
const docsContentDir = join(docsDir, 'docs')
const staticDir = join(docsDir, 'static')
const corePkgDir = join(repoRoot, 'packages', 'core')

// Sibling adapter packages — each gets its own llms.txt sourced from one doc
// page. Listed in the order they appear in the sidebar.
const SIBLING_PACKAGES = [
  {
    pkg: 'gestures',
    docId: 'gestures-adapter',
    name: '@rootnative/inertia-gestures',
  },
  {
    pkg: 'gradients',
    docId: 'gradients',
    name: '@rootnative/inertia-gradients',
  },
  {
    pkg: 'svg',
    docId: 'svg',
    name: '@rootnative/inertia-svg',
  },
]

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
  'gestures-adapter',
  'gradients',
  'svg',
  'presence',
  'layout',
  'motion-config',
  'perf-bench',
  'testing',
  'migrations/from-reanimated',
  'api/hooks',
  'api/create-motion-component',
  'api/transition-utilities',
  'api/reanimated-interop',
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

function resolveDocPath(id) {
  const mdx = join(docsContentDir, `${id}.mdx`)
  if (existsSync(mdx)) return mdx
  const md = join(docsContentDir, `${id}.md`)
  if (existsSync(md)) return md
  throw new Error(
    `[build-llms] doc page not found for id "${id}" — looked for ${id}.mdx and ${id}.md in ${docsContentDir}`,
  )
}

// MDX pages can include `import` statements at the top — strip them so the
// llms output stays plain prose.
function stripMdxImports(md) {
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('import ') || line.trim() === '') {
      i++
      continue
    }
    break
  }
  return lines.slice(i).join('\n')
}

// Replace the JSX components used by the docs with plain-text equivalents so
// the llms output is readable by tools that don't render React.
function expandJsxComponents(md) {
  // <PackageManagerTabs packages="..." /> → ```bash\nyarn add ...\n```
  md = md.replace(
    /<PackageManagerTabs\s+packages=["']([^"']+)["']\s*\/>/g,
    (_, pkgs) => '```bash\nyarn add ' + pkgs + '\n```',
  )
  // <RunnableExample ... /> → drop. The live demo isn't useful in a text dump.
  md = md.replace(/<RunnableExample\b[^/]*\/>/g, '')
  return md
}

function buildLlmsFull() {
  const sections = PAGES.map((id) => {
    const path = resolveDocPath(id)
    const raw = readFileSync(path, 'utf8')
    return expandJsxComponents(stripMdxImports(stripFrontmatter(raw))).trimEnd()
  })

  const header = [
    '# Inertia — full API reference',
    '',
    '> This file aggregates every documentation page in source order. Generated from docs/docs/*.md by scripts/build-llms.mjs — do not edit by hand.',
    '',
    `> Source: https://github.com/rootnative/inertia`,
    `> Site:   https://rootnative.github.io/inertia/`,
    '',
    '---',
    '',
  ].join('\n')

  const body = sections.join('\n\n---\n\n')
  return header + body + '\n'
}

function buildSiblingLlms({ docId, name }) {
  const path = resolveDocPath(docId)
  const raw = readFileSync(path, 'utf8')
  const body = expandJsxComponents(
    stripMdxImports(stripFrontmatter(raw)),
  ).trimEnd()

  const header = [
    `> ${name} — adapter package for @rootnative/inertia.`,
    '> This file is generated from the matching docs page by scripts/build-llms.mjs — do not edit by hand.',
    '',
    '> Full docs:    https://rootnative.github.io/inertia/',
    '> Core overview: see @rootnative/inertia/llms.txt (or docs/static/llms.txt in the repo)',
    '> Source:        https://github.com/rootnative/inertia',
    '',
    '---',
    '',
  ].join('\n')

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

for (const sibling of SIBLING_PACKAGES) {
  const outPath = join(repoRoot, 'packages', sibling.pkg, 'llms.txt')
  console.log(`[build-llms] writing packages/${sibling.pkg}/llms.txt …`)
  writeFileSync(outPath, buildSiblingLlms(sibling))
}

console.log('[build-llms] done.')
