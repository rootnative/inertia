#!/usr/bin/env node
/**
 * Version-consistency guard.
 *
 * Every public package ships in **lockstep** (see CLAUDE.md "Versioning &
 * Release"), so the version in `packages/core/package.json` is the single
 * source of truth. Everything else that names a version must agree with it.
 * Historically it didn't: `0.0.2` shipped with three adapter CHANGELOGs still
 * topping out at `0.0.1`, a README claiming `0.0.1`, a docs page claiming
 * `0.0.0-alpha`, and compare links pointing at the `alpha.2` tag. This script
 * is what stops that recurring.
 *
 * Checks:
 *   1. Lockstep     — every non-private package is at the core version.
 *   2. Peer range   — each adapter's `@rootnative/inertia` peer is `>=<core>`.
 *   3. Changelog    — each package has a `## [<version>]` section (a release
 *                     with no entry is the failure mode that shipped in 0.0.2).
 *   4. Link refs    — every `## [x.y.z]` heading has a matching link
 *                     definition, and `[unreleased]` compares from the newest
 *                     released tag.
 *   5. Status lines — the `> **Status:** \`x.y.z\`` line in README.md,
 *                     docs/docs/index.mdx, and packages/core/README.md names
 *                     the current version. The core README is in the list
 *                     because it ships in the npm tarball: it claimed `0.0.1`
 *                     on the published page for `0.0.2` and `0.0.3` while the
 *                     two files the guard did watch were correct.
 *   6. Version form  — no `v`-prefixed version strings (`v0.2`, `v1.0.0`) in
 *                     any published surface. Versions are always written as
 *                     bare three-digit semver; the two-digit `v0.x` ladder was
 *                     abandoned before `0.0.1` but survived in a dozen docs,
 *                     READMEs, and JSDoc blocks, some of them promising
 *                     releases (`Radial lands in v0.3`) that were never on the
 *                     roadmap. URLs are exempt (the SemVer spec link is
 *                     `.../spec/v2.0.0.html`).
 *
 * Usage:
 *   node scripts/check-versions.mjs          # verify, non-zero exit on drift
 *   node scripts/check-versions.mjs --fix    # repair what's mechanically fixable
 *
 * `--fix` rewrites link footers and status-line version tokens. It will not
 * invent a CHANGELOG entry — the release note is editorial, so a missing
 * section is always reported for a human to write.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const packagesDir = join(repoRoot, 'packages')

const FIX = process.argv.includes('--fix')

const REPO_URL = 'https://github.com/rootnative/inertia'

/**
 * Git tags are cut as `core+gestures+gradients+svg@<version>` — one tag for
 * the whole lockstep release, not one per package. Both release workflows
 * build the tag from the package list they published, so the label is the
 * `+`-joined set of published package dirs.
 */
const tagFor = (packageDirs, version) => `${packageDirs.join('+')}@${version}`

/** Files carrying a `> **Status:** \`x.y.z\`` line that must name the current version. */
const STATUS_FILES = [
  'README.md',
  join('docs', 'docs', 'index.mdx'),
  join('packages', 'core', 'README.md'),
]
const STATUS_RE = /^(> \*\*Status:\*\* `)([^`]+)(`)/m

/**
 * Roots scanned by check 6. Directories are walked for the listed extensions;
 * generated `llms.txt` files are included deliberately — they are derived from
 * `docs/docs/*`, so a hit there means the source drifted or the generator
 * wasn't re-run.
 */
const FORM_SCAN_ROOTS = [
  { path: 'README.md' },
  { path: 'packages', exts: ['.md', '.txt', '.ts', '.tsx', '.cjs'] },
  { path: join('docs', 'docs'), exts: ['.md', '.mdx'] },
  { path: join('docs', 'static'), exts: ['.txt'] },
  { path: 'example', exts: ['.ts', '.tsx'] },
]
const FORM_SCAN_IGNORE = new Set(['node_modules', 'dist', '.docusaurus', 'build'])
/** `v` immediately followed by a version number — `v0.2`, `v1.0.0`, `v0.0.0-alpha.0`. */
const V_PREFIX_RE = /\bv\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?/g
/** Stripped before scanning: a `v`-prefixed version inside a URL is somebody else's. */
const URL_RE = /https?:\/\/\S+/g

const problems = []
const fixes = []
const fail = (msg) => problems.push(msg)
const fixed = (msg) => fixes.push(msg)

// ── Discover public packages ────────────────────────────────────────────────

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .filter((name) => {
    try {
      return (
        JSON.parse(
          readFileSync(join(packagesDir, name, 'package.json'), 'utf8'),
        ).private !== true
      )
    } catch {
      return false
    }
  })
  .sort()

if (!packageDirs.includes('core')) {
  console.error('[check-versions] no public `core` package found under packages/')
  process.exit(1)
}

// `core` first, then the adapters — matches the publish order in the release
// workflows and the tag label already in git history.
const orderedDirs = ['core', ...packageDirs.filter((d) => d !== 'core')]

const readPkg = (dir) =>
  JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8'))

const VERSION = readPkg('core').version
const RELEASE_TAG = tagFor(orderedDirs, VERSION)

// ── 1. Lockstep versions ────────────────────────────────────────────────────

for (const dir of orderedDirs) {
  const pkg = readPkg(dir)
  if (pkg.version !== VERSION) {
    fail(
      `packages/${dir}/package.json: version ${pkg.version} — expected ${VERSION}. ` +
        `All public packages ship in lockstep (every tag in history is the full ` +
        `"${orderedDirs.join('+')}@x.y.z" label). If you deliberately published a ` +
        `subset via release-manual.yml, bring the rest up to ${VERSION} to restore ` +
        `lockstep, or use release.yml which bumps them together.`,
    )
  }
}

// ── 2. Adapter peer range on core ───────────────────────────────────────────

for (const dir of orderedDirs) {
  if (dir === 'core') continue
  const pkg = readPkg(dir)
  const range = pkg.peerDependencies?.['@rootnative/inertia']
  if (range === undefined) continue
  const expected = `>=${VERSION}`
  if (range !== expected) {
    fail(
      `packages/${dir}/package.json: peerDependencies["@rootnative/inertia"] is ` +
        `"${range}" — expected "${expected}".`,
    )
  }
}

// ── 3 + 4. CHANGELOG sections and link footers ──────────────────────────────

/**
 * Rebuild a changelog's link-reference footer from its own `## [x.y.z]`
 * headings. `[unreleased]` compares the newest released tag against HEAD;
 * every other heading resolves to its release tag. Headings are emitted
 * newest-first, matching the body order.
 */
function buildFooter(versions) {
  const lines = []
  if (versions.length > 0) {
    lines.push(
      `[unreleased]: ${REPO_URL}/compare/${tagFor(orderedDirs, versions[0])}...HEAD`,
    )
  }
  for (const v of versions) {
    lines.push(`[${v}]: ${REPO_URL}/releases/tag/${tagFor(orderedDirs, v)}`)
  }
  return lines.join('\n')
}

for (const dir of orderedDirs) {
  const relPath = `packages/${dir}/CHANGELOG.md`
  const absPath = join(packagesDir, dir, 'CHANGELOG.md')
  let raw
  try {
    raw = readFileSync(absPath, 'utf8')
  } catch {
    fail(`${relPath}: missing.`)
    continue
  }

  // Released-version headings, in document order (newest first by convention).
  const versions = [...raw.matchAll(/^## \[(\d[^\]]*)\]/gm)].map((m) => m[1])

  if (!versions.includes(VERSION)) {
    fail(
      `${relPath}: no "## [${VERSION}]" section, but the package is published at ` +
        `${VERSION}. Write the release note by hand — --fix will not invent one.`,
    )
  }

  // Split body from the trailing block of link definitions.
  const footerRe = /(?:^\[[^\]]+\]:[^\n]*\n?)+$/m
  const match = raw.match(footerRe)
  const expectedFooter = buildFooter(versions)
  const currentFooter = match ? match[0].trimEnd() : ''

  if (currentFooter !== expectedFooter) {
    if (FIX) {
      const body = match ? raw.slice(0, match.index) : raw
      writeFileSync(absPath, `${body.trimEnd()}\n\n${expectedFooter}\n`)
      fixed(`${relPath}: rebuilt link-reference footer.`)
    } else {
      const missing = versions.filter(
        (v) => !currentFooter.includes(`\n[${v}]:`) && !currentFooter.startsWith(`[${v}]:`),
      )
      fail(
        `${relPath}: link footer is stale` +
          (missing.length ? ` (no definition for ${missing.join(', ')})` : '') +
          `. Run \`pnpm run check:versions --fix\`.`,
      )
    }
  }
}

// ── 5. Status lines ─────────────────────────────────────────────────────────

for (const rel of STATUS_FILES) {
  const abs = join(repoRoot, rel)
  let raw
  try {
    raw = readFileSync(abs, 'utf8')
  } catch {
    fail(`${rel}: missing.`)
    continue
  }
  const match = raw.match(STATUS_RE)
  if (!match) {
    fail(
      `${rel}: no "> **Status:** \`x.y.z\`" line found. The version guard keys on ` +
        `that exact shape — keep it, or update STATUS_FILES in scripts/check-versions.mjs.`,
    )
    continue
  }
  if (match[2] !== VERSION) {
    if (FIX) {
      writeFileSync(abs, raw.replace(STATUS_RE, `$1${VERSION}$3`))
      fixed(`${rel}: status version ${match[2]} → ${VERSION}.`)
    } else {
      fail(
        `${rel}: status line says \`${match[2]}\`, expected \`${VERSION}\`. ` +
          `Run \`pnpm run check:versions --fix\`.`,
      )
    }
  }
}

// ── 6. Version form: no `v`-prefixed versions in published surfaces ─────────

/** Every file under `root` with a listed extension, recursively. */
function collectFiles(root, exts) {
  const abs = join(repoRoot, root)
  let entries
  try {
    entries = readdirSync(abs, { withFileTypes: true })
  } catch {
    return []
  }
  const out = []
  for (const entry of entries) {
    if (FORM_SCAN_IGNORE.has(entry.name)) continue
    const rel = join(root, entry.name)
    if (entry.isDirectory()) out.push(...collectFiles(rel, exts))
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(rel)
  }
  return out
}

for (const { path: root, exts } of FORM_SCAN_ROOTS) {
  const files = exts ? collectFiles(root, exts) : [root]
  for (const rel of files) {
    let raw
    try {
      raw = readFileSync(join(repoRoot, rel), 'utf8')
    } catch {
      continue
    }
    // Blank URLs out rather than dropping them, so line numbers survive.
    const scannable = raw.replace(URL_RE, (m) => ' '.repeat(m.length))
    scannable.split('\n').forEach((line, i) => {
      for (const hit of line.matchAll(V_PREFIX_RE)) {
        fail(
          `${rel}:${i + 1}: "${hit[0]}" — versions are written as bare three-digit ` +
            `semver, never \`v\`-prefixed. Drop the \`v\` (and if it names an ` +
            `abandoned two-digit release like \`v0.2\`, say what is actually true ` +
            `now rather than mapping it onto the current ladder).`,
        )
      }
    })
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

for (const f of fixes) console.log(`[check-versions] fixed  ${f}`)
for (const p of problems) console.error(`[check-versions] ERROR  ${p}`)

if (problems.length > 0) {
  console.error(
    `\n[check-versions] ${problems.length} problem(s) against core version ${VERSION} ` +
      `(release tag ${RELEASE_TAG}).`,
  )
  process.exit(1)
}

console.log(
  `[check-versions] ok — ${orderedDirs.length} packages in lockstep at ${VERSION} ` +
    `(release tag ${RELEASE_TAG})${fixes.length ? `, ${fixes.length} fix(es) applied` : ''}.`,
)
