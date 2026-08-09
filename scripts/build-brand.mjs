#!/usr/bin/env node
// Builds every Inertia brand asset from the one geometry definition below.
//
// The mark is a "motion echo": a leading rounded square with two trailing
// ghosts, offset along a constant vector. It says what the library is named
// after -- a mass that carries its motion -- and it survives a 16 px favicon
// because it is solid shapes rather than strokes.
//
// This script is the single source of truth. `assets/brand/*.svg`,
// `docs/static/img/*`, and `example/assets/*` are all generated; edit the
// constants here, re-run, and commit the output.
//
//   node scripts/build-brand.mjs
//
// Every mark raster is drawn by the small renderer in this file rather than by
// an external tool. That is not reinvention for its own sake: the first version
// shelled out to macOS QuickLook (`qlmanage`) and shipped two silent defects,
// because a thumbnailer is not a rasterizer.
//
//   1. QuickLook composites onto opaque white. Nothing it emitted was ever
//      transparent, so the "transparent" favicon and the Android adaptive-icon
//      foreground were both solid white tiles.
//   2. It anchors artwork top-left when the requested size exceeds the size it
//      infers, instead of scaling. The 180 px favicon came out as a half-size
//      mark in the corner of its frame.
//
// The mark is only rounded rectangles filled with a linear gradient, so drawing
// it directly is a few dozen lines, gives real alpha, is exact at every size,
// and works on any platform. The one exception is the social card, which needs
// text: that still goes through QuickLook, and it is unaffected by (1) because
// the card paints its own opaque background.

import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const BRAND_DIR = path.join(ROOT, 'assets', 'brand')
const DOCS_IMG_DIR = path.join(ROOT, 'docs', 'static', 'img')
const EXAMPLE_ASSET_DIR = path.join(ROOT, 'example', 'assets')

// --- palette -----------------------------------------------------------------
// These are the two accent tokens the docs stylesheet already defines, plus the
// midpoint that carries the hue shift across the trail. Keep them in step with
// `--inertia-accent` / `--inertia-accent-2` in docs/src/css/custom.css.
const LIGHT_STOPS = ['#ec4899', '#6366f1', '#4f46e5']
const DARK_STOPS = ['#f472b6', '#8b8ff9', '#818cf8']

// Where the middle stop sits along the gradient. The SVG emitters and the
// renderer both read this, so an emitted SVG and its PNG cannot drift apart.
const GRADIENT_MID_OFFSET = 0.55

// Backdrop for the app icon and the social card. Near-black rather than pure
// black so the mark's pink tail stays visible against it.
const CANVAS_DARK = '#0b0b0f'

// --- geometry ----------------------------------------------------------------
// Three squares on a 64-unit canvas, each step offset by (-11, +12) and scaled
// down, so the trail reads as distance rather than as a stack of cards. The
// bounding box is centred on (32, 32); changing a size or an offset means
// re-checking that.
const MARK_VIEWBOX = 64

const MARK_SHAPES = [
  { x: 4.5, y: 31.5, size: 25, rx: 8, opacity: 0.3 },
  { x: 15.5, y: 19.5, size: 29, rx: 9, opacity: 0.6 },
  { x: 26.5, y: 7.5, size: 33, rx: 10.5, opacity: 1 },
]

// At 32 px and below the middle ghost collapses to a ~2 px sliver and the mark
// turns to mush, so favicons get a two-shape reduction with a wider offset.
const COMPACT_SHAPES = [
  { x: 6, y: 24, size: 32, rx: 10, opacity: 0.45 },
  { x: 21, y: 7, size: 38, rx: 12, opacity: 1 },
]

// Gradient axis, in canvas units: bottom-left (tail) to top-right (lead).
const MARK_AXIS = { x1: 4.5, y1: 56.5, x2: 59.5, y2: 7.5 }
const COMPACT_AXIS = { x1: 6, y1: 56, x2: 59, y2: 7 }

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, Arial, sans-serif"

// --- SVG builders ------------------------------------------------------------

function gradient(id, stops, axis) {
  const [from, mid, to] = stops
  return [
    `  <defs>`,
    `    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${axis.x1}" y1="${axis.y1}" x2="${axis.x2}" y2="${axis.y2}">`,
    `      <stop offset="0" stop-color="${from}" />`,
    `      <stop offset="${GRADIENT_MID_OFFSET}" stop-color="${mid}" />`,
    `      <stop offset="1" stop-color="${to}" />`,
    `    </linearGradient>`,
    `  </defs>`,
  ].join('\n')
}

function shapes(id, list, indent = '    ') {
  const rects = list.map((s) => {
    const opacity = s.opacity === 1 ? '' : ` opacity="${s.opacity}"`
    return `${indent}  <rect x="${s.x}" y="${s.y}" width="${s.size}" height="${s.size}" rx="${s.rx}"${opacity} />`
  })
  return [`${indent}<g fill="url(#${id})">`, ...rects, `${indent}</g>`].join(
    '\n',
  )
}

/**
 * The mark on its own, transparent, filling the viewBox. These SVGs are what
 * the docs navbar loads; every PNG comes from `renderMark` instead.
 *
 * `width` / `height` are set as well as `viewBox` because Safari gives an SVG
 * with no intrinsic size a zero width inside an `<img>` that only sets
 * `height` -- exactly how Docusaurus renders a navbar logo.
 */
function markSvg({ id, stops, shapeList, axis, note, size = MARK_VIEWBOX }) {
  return [
    note ? `<!--\n${note}\n-->` : null,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" fill="none" role="img" aria-label="Inertia">`,
    `  <title>Inertia</title>`,
    gradient(id, stops, axis),
    shapes(id, shapeList, '  '),
    `</svg>`,
    ``,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

/**
 * Open Graph / Twitter card: mark, wordmark, tagline, package name.
 *
 * `square` letterboxes the same artwork into a 1200x1200 canvas. QuickLook only
 * emits square thumbnails, so the raster path renders the square form and crops
 * the middle band back out; the 1200x630 form is what gets committed as the
 * readable source.
 */
function socialCardSvg({ square = false } = {}) {
  const [from, mid, to] = DARK_STOPS
  const height = square ? CARD_WIDTH : CARD_HEIGHT
  const shift = square ? (CARD_WIDTH - CARD_HEIGHT) / 2 : 0

  return `<!--
  Open Graph / Twitter card, ${CARD_WIDTH}x${CARD_HEIGHT}. Text is baked into the raster output,
  so the font stack only has to resolve on the machine running this script.
-->
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${height}" viewBox="0 0 ${CARD_WIDTH} ${height}" fill="none">
  <title>Inertia — declarative animation primitives for React Native</title>
  <defs>
    <linearGradient id="cardMark" gradientUnits="userSpaceOnUse" x1="110" y1="297" x2="286" y2="120">
      <stop offset="0" stop-color="${from}" />
      <stop offset="0.55" stop-color="${mid}" />
      <stop offset="1" stop-color="${to}" />
    </linearGradient>
    <linearGradient id="cardBar" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${CARD_WIDTH}" y2="0">
      <stop offset="0" stop-color="${from}" />
      <stop offset="0.55" stop-color="${mid}" />
      <stop offset="1" stop-color="${to}" />
    </linearGradient>
    <radialGradient id="cardGlow" gradientUnits="userSpaceOnUse" cx="1020" cy="110" r="560">
      <stop offset="0" stop-color="#4f46e5" stop-opacity="0.34" />
      <stop offset="0.55" stop-color="#ec4899" stop-opacity="0.09" />
      <stop offset="1" stop-color="${CANVAS_DARK}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${CARD_WIDTH}" height="${height}" fill="${CANVAS_DARK}" />
  <g transform="translate(0 ${shift})">
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${CANVAS_DARK}" />
    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#cardGlow)" />
    <rect y="${CARD_HEIGHT - 5}" width="${CARD_WIDTH}" height="5" fill="url(#cardBar)" />

    <g transform="translate(96 96) scale(3.2)" fill="url(#cardMark)">
      <rect x="4.5" y="31.5" width="25" height="25" rx="8" opacity="0.3" />
      <rect x="15.5" y="19.5" width="29" height="29" rx="9" opacity="0.6" />
      <rect x="26.5" y="7.5" width="33" height="33" rx="10.5" />
    </g>

    <text x="110" y="380" font-family="${FONT_STACK}" font-size="96" font-weight="700" letter-spacing="-3" fill="#fafafa">Inertia</text>
    <text x="110" y="436" font-family="${FONT_STACK}" font-size="34" font-weight="500" fill="#a1a1aa">Declarative animation primitives for React Native</text>
    <text x="110" y="512" font-family="${FONT_STACK}" font-size="26" font-weight="500" letter-spacing="0.4" fill="#71717a">@rootnative/inertia</text>
  </g>
</svg>
`
}

// --- rasterization -----------------------------------------------------------

let scratch = null

function scratchDir() {
  if (!scratch) scratch = mkdtempSync(path.join(tmpdir(), 'inertia-brand-'))
  return scratch
}

// QuickLook caches thumbnails per input path, and re-rendering the same path
// can return the previous run's image even after the bytes change. The social
// card is the only thing still going through it, but the counter is cheap
// insurance against a fixed asset still looking broken.
let renderSeq = 0

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

/** Bounding box of the artwork in viewBox units. */
function artworkBounds(shapeList) {
  const x0 = Math.min(...shapeList.map((s) => s.x))
  const y0 = Math.min(...shapeList.map((s) => s.y))
  const x1 = Math.max(...shapeList.map((s) => s.x + s.size))
  const y1 = Math.max(...shapeList.map((s) => s.y + s.size))
  return { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 }
}

/** Colour at position `t` along the three-stop gradient, in sRGB. */
function gradientColorAt(t, stops) {
  const rgb = stops.map(hexToRgb)
  if (t <= 0) return rgb[0]
  if (t >= 1) return rgb[2]

  const mid = GRADIENT_MID_OFFSET
  const lower = t <= mid ? 0 : 1
  const from = lower === 0 ? 0 : mid
  const to = lower === 0 ? mid : 1
  const f = (t - from) / (to - from)
  return [0, 1, 2].map(
    (k) => rgb[lower][k] + (rgb[lower + 1][k] - rgb[lower][k]) * f,
  )
}

/** Is a point inside a rounded rectangle? Same maths as an SVG `rect` with `rx`. */
function insideRoundedRect(px, py, s) {
  const x1 = s.x + s.size
  const y1 = s.y + s.size
  if (px < s.x || px > x1 || py < s.y || py > y1) return false
  const qx = Math.max(s.x + s.rx - px, px - (x1 - s.rx), 0)
  const qy = Math.max(s.y + s.rx - py, py - (y1 - s.rx), 0)
  return qx * qx + qy * qy <= s.rx * s.rx
}

// Samples per axis for anti-aliasing; 4 gives 16 per pixel, which is smooth at
// 16 px and still fast enough at 1024 px.
const AA = 4

/**
 * Draw the mark to an RGBA PNG.
 *
 * `scale` is the fraction of the canvas the artwork's bounding box fills, so it
 * means the same thing at every size and is what sets each slot's padding: a
 * favicon wants almost the whole frame, an Android adaptive foreground has to
 * stay inside the 66% safe circle. `background` makes the canvas opaque;
 * omitting it leaves genuine transparency.
 */
function renderMark({
  shapeList,
  stops,
  axis,
  size,
  scale = 1,
  background = null,
}) {
  const bounds = artworkBounds(shapeList)
  const unit = (size * scale) / Math.max(bounds.width, bounds.height)
  const originX = size / 2 - ((bounds.x0 + bounds.x1) / 2) * unit
  const originY = size / 2 - ((bounds.y0 + bounds.y1) / 2) * unit

  const toUnitX = (deviceX) => (deviceX - originX) / unit
  const toUnitY = (deviceY) => (deviceY - originY) / unit

  const axisX = axis.x2 - axis.x1
  const axisY = axis.y2 - axis.y1
  const axisLenSq = axisX * axisX + axisY * axisY

  // Device-space bounding box per shape, so most pixels skip supersampling.
  const boxes = shapeList.map((s) => ({
    left: s.x * unit + originX - 1,
    top: s.y * unit + originY - 1,
    right: (s.x + s.size) * unit + originX + 1,
    bottom: (s.y + s.size) * unit + originY + 1,
  }))

  const base = background ? hexToRgb(background) : null
  const rgba = Buffer.alloc(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      if (base) {
        r = base[0]
        g = base[1]
        b = base[2]
        a = 1
      }

      for (let i = 0; i < shapeList.length; i++) {
        const box = boxes[i]
        if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
          continue
        }

        const s = shapeList[i]
        let hits = 0
        for (let sy = 0; sy < AA; sy++) {
          const uy = toUnitY(y + (sy + 0.5) / AA)
          for (let sx = 0; sx < AA; sx++) {
            if (insideRoundedRect(toUnitX(x + (sx + 0.5) / AA), uy, s)) hits++
          }
        }
        if (hits === 0) continue

        const alpha = (hits / (AA * AA)) * s.opacity
        const ux = toUnitX(x + 0.5)
        const uy = toUnitY(y + 0.5)
        const t = axisLenSq
          ? ((ux - axis.x1) * axisX + (uy - axis.y1) * axisY) / axisLenSq
          : 0
        const [cr, cg, cb] = gradientColorAt(t, stops)

        // Source-over, un-premultiplied.
        const out = alpha + a * (1 - alpha)
        if (out > 0) {
          const keep = (a * (1 - alpha)) / out
          const add = alpha / out
          r = cr * add + r * keep
          g = cg * add + g * keep
          b = cb * add + b * keep
        }
        a = out
      }

      const o = (y * size + x) * 4
      rgba[o] = Math.round(r)
      rgba[o + 1] = Math.round(g)
      rgba[o + 2] = Math.round(b)
      rgba[o + 3] = Math.round(a * 255)
    }
  }

  return encodePng(rgba, size, size)
}

// --- PNG encoding -------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

/** 8-bit RGBA PNG, one filter-0 scanline per row. */
function encodePng(rgba, width, height) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** Read a PNG's declared dimensions straight out of IHDR. */
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// --- QuickLook, for the social card only --------------------------------------

/**
 * Render the social card via QuickLook, which is the only step needing a text
 * renderer. It emits square thumbnails only, so the card is drawn letterboxed
 * into a square and cropped back with `sips`.
 */
function rasterizeCard(svg, width, height, label) {
  const dir = scratchDir()
  const stem = `${label}-${renderSeq++}`
  const svgPath = path.join(dir, `${stem}.svg`)
  writeFileSync(svgPath, svg)

  execFileSync('qlmanage', ['-t', '-s', String(width), '-o', dir, svgPath], {
    stdio: 'ignore',
  })

  const square = path.join(dir, `${stem}.svg.png`)
  const cropped = path.join(dir, `${stem}.cropped.png`)
  // sips takes the crop box as height then width, anchored at the centre.
  execFileSync(
    'sips',
    ['-c', String(height), String(width), square, '--out', cropped],
    { stdio: 'ignore' },
  )

  const png = readFileSync(cropped)
  const actual = pngSize(png)
  if (actual.width !== width || actual.height !== height) {
    throw new Error(
      `${label}: expected ${width}x${height} but QuickLook produced ` +
        `${actual.width}x${actual.height}.`,
    )
  }
  return png
}

/**
 * Pack PNG blobs into an .ico. Windows has accepted PNG-compressed entries
 * since Vista, so no BMP encoding is needed -- the directory just points at
 * each PNG.
 */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const directory = Buffer.alloc(16 * entries.length)
  let offset = header.length + directory.length

  entries.forEach((entry, index) => {
    const at = index * 16
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 0)
    directory.writeUInt8(entry.size >= 256 ? 0 : entry.size, at + 1)
    directory.writeUInt8(0, at + 2) // palette size
    directory.writeUInt8(0, at + 3) // reserved
    directory.writeUInt16LE(1, at + 4) // colour planes
    directory.writeUInt16LE(32, at + 6) // bits per pixel
    directory.writeUInt32LE(entry.png.length, at + 8)
    directory.writeUInt32LE(offset, at + 12)
    offset += entry.png.length
  })

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)])
}

// --- outputs -----------------------------------------------------------------

const written = []

function write(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, contents)
  written.push(path.relative(ROOT, file))
}

const MARK = {
  id: 'inertiaEcho',
  stops: LIGHT_STOPS,
  shapeList: MARK_SHAPES,
  axis: MARK_AXIS,
}
const MARK_DARK = { ...MARK, id: 'inertiaEchoDark', stops: DARK_STOPS }
const COMPACT = {
  id: 'inertiaEchoCompact',
  stops: LIGHT_STOPS,
  shapeList: COMPACT_SHAPES,
  axis: COMPACT_AXIS,
}

function main() {
  // 1. Canonical SVG sources.
  write(path.join(BRAND_DIR, 'inertia-mark.svg'), markSvg(MARK))
  write(
    path.join(BRAND_DIR, 'inertia-mark-dark.svg'),
    markSvg({
      ...MARK_DARK,
      note: '  Lighter accent pair, for the dark navbar and any dark surface where the\n  #4f46e5 lead loses contrast.',
    }),
  )
  write(
    path.join(BRAND_DIR, 'inertia-mark-compact.svg'),
    markSvg({
      ...COMPACT,
      note: '  Two-shape reduction for sizes where the middle ghost collapses into a\n  sliver: favicons, and anything below roughly 24 px.',
    }),
  )
  write(path.join(BRAND_DIR, 'inertia-social-card.svg'), socialCardSvg())

  // 2. A 512 px PNG of the mark, for READMEs. npm does not resolve relative
  //    paths, so the package READMEs point at this file's raw GitHub URL.
  //    Transparent, so it sits correctly on GitHub's light and dark themes.
  write(
    path.join(BRAND_DIR, 'inertia-mark.png'),
    renderMark({ ...MARK, size: 512, scale: 0.9 }),
  )

  // 3. Docs site.
  write(path.join(DOCS_IMG_DIR, 'logo.svg'), markSvg(MARK))
  write(path.join(DOCS_IMG_DIR, 'logo-dark.svg'), markSvg(MARK_DARK))
  write(
    path.join(DOCS_IMG_DIR, 'social-card.png'),
    rasterizeCard(
      socialCardSvg({ square: true }),
      CARD_WIDTH,
      CARD_HEIGHT,
      'social-card',
    ),
  )

  // Favicons fill almost the whole frame: a browser tab is ~16 px of usable
  // space and padding there is space thrown away.
  const favicon = (size) => renderMark({ ...COMPACT, size, scale: 0.94 })
  write(path.join(DOCS_IMG_DIR, 'favicon.png'), favicon(180))
  write(
    path.join(DOCS_IMG_DIR, 'favicon.ico'),
    buildIco([16, 32, 48].map((size) => ({ size, png: favicon(size) }))),
  )

  // 4. Example app. Scales are per slot: the store icon fills its tile, the
  //    adaptive foreground has to stay inside Android's 66% safe circle, and
  //    the splash is small because `resizeMode: contain` fits a square image to
  //    the full screen width.
  write(
    path.join(EXAMPLE_ASSET_DIR, 'icon.png'),
    renderMark({ ...MARK, size: 1024, scale: 0.66, background: CANVAS_DARK }),
  )
  write(
    path.join(EXAMPLE_ASSET_DIR, 'adaptive-icon.png'),
    renderMark({ ...MARK, size: 1024, scale: 0.45 }),
  )
  write(
    path.join(EXAMPLE_ASSET_DIR, 'splash-icon.png'),
    renderMark({ ...MARK, size: 1024, scale: 0.34 }),
  )
  write(path.join(EXAMPLE_ASSET_DIR, 'favicon.png'), favicon(64))

  if (scratch) rmSync(scratch, { recursive: true, force: true })

  console.log(`Wrote ${written.length} brand assets:`)
  for (const file of written) console.log(`  ${file}`)
}

main()
