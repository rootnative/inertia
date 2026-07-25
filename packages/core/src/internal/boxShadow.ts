/**
 * CSS `box-shadow` parsing + pairing for `useShadow`.
 *
 * Design systems store web elevation tokens as CSS `box-shadow` strings
 * (`'0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)'`).
 * Like `cubicBezier`, this module makes those tokens directly consumable:
 * strings are parsed once on the JS thread into flat layer records the
 * `useShadow` worklet can interpolate without any frame-time string work.
 *
 * Invalid input **throws** rather than warning — shadow tokens are
 * constructed at theme/module setup, and a malformed token should fail
 * loudly there, not silently render the wrong elevation.
 */

/**
 * One layer of a `box-shadow`, structurally mirroring React Native's
 * `BoxShadowValue` (RN 0.76+ `boxShadow` style). Lengths are px numbers.
 */
export interface BoxShadowLayer {
  offsetX: number
  offsetY: number
  /** Must be >= 0, per CSS. @default 0 */
  blurRadius?: number
  /** @default 0 */
  spreadDistance?: number
  /** Any color string Reanimated's `interpolateColor` accepts. @default 'black' */
  color?: string
  /** @default false */
  inset?: boolean
}

/** A layer with every field resolved to a concrete value. */
export interface ResolvedBoxShadowLayer {
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadDistance: number
  color: string
  inset: boolean
}

const LENGTH = /^[+-]?(\d+\.?\d*|\.\d+)(px)?$/i
const UNIT_LIKE = /^[+-]?(\d+\.?\d*|\.\d+)[a-z%]+$/i

function invalid(input: string, reason: string): Error {
  return new Error(
    `[inertia] parseBoxShadow: ${reason} in ${JSON.stringify(input)}. ` +
      'Expected CSS box-shadow syntax with px lengths: ' +
      "'[inset] <offset-x> <offset-y> [blur] [spread] [color], ...'",
  )
}

/**
 * Split a box-shadow string into layer strings on top-level commas —
 * commas inside color functions (`rgba(0, 0, 0, 0.3)`) don't split.
 */
function splitLayers(input: string): string[] {
  const layers: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      layers.push(input.slice(start, i))
      start = i + 1
    }
  }
  layers.push(input.slice(start))
  return layers
}

/**
 * Split one layer into whitespace-separated tokens, keeping color
 * functions (which may contain spaces: `rgb(0 0 0 / 40%)`) as one token.
 */
function tokenize(layer: string): string[] {
  const tokens: string[] = []
  let depth = 0
  let current = ''
  for (const ch of layer) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (depth === 0 && /\s/.test(ch)) {
      if (current) tokens.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) tokens.push(current)
  return tokens
}

/**
 * Parse a CSS `box-shadow` string into resolved layers. `'none'` parses to
 * an empty list. Only px (and unitless) lengths are supported — other units
 * depend on font/viewport context that a style value can't resolve.
 */
export function parseBoxShadow(input: string): ResolvedBoxShadowLayer[] {
  const trimmed = input.trim()
  if (trimmed === '') throw invalid(input, 'empty string')
  if (trimmed.toLowerCase() === 'none') return []

  return splitLayers(trimmed).map((layerString) => {
    const tokens = tokenize(layerString.trim())
    if (tokens.length === 0) throw invalid(input, 'empty layer')

    const lengths: number[] = []
    let color: string | undefined
    let inset = false
    for (const token of tokens) {
      if (token.toLowerCase() === 'inset') {
        if (inset) throw invalid(input, "duplicate 'inset'")
        inset = true
      } else if (LENGTH.test(token)) {
        lengths.push(parseFloat(token))
      } else if (UNIT_LIKE.test(token)) {
        throw invalid(input, `unsupported unit in ${JSON.stringify(token)}`)
      } else {
        if (color !== undefined) throw invalid(input, 'multiple colors')
        color = token
      }
    }

    if (lengths.length < 2 || lengths.length > 4) {
      throw invalid(input, `expected 2-4 lengths, got ${lengths.length}`)
    }
    // The `= 0` on the offsets never fires (length >= 2 is validated
    // above); it's here for noUncheckedIndexedAccess.
    const [offsetX = 0, offsetY = 0, blurRadius = 0, spreadDistance = 0] =
      lengths
    if (blurRadius < 0) throw invalid(input, 'negative blur radius')

    return {
      offsetX,
      offsetY,
      blurRadius,
      spreadDistance,
      color: color ?? 'black',
      inset,
    }
  })
}

/**
 * Resolve either input form (CSS string or structured layers) to layers.
 *
 * Lengths may arrive as numbers (what `useShadow`'s `BoxShadowLayer` declares)
 * or as px strings (what RN's own `BoxShadowValue` permits, so what the
 * `animate` surface has to accept). `coerceLength` normalizes both and rejects
 * anything else, so downstream only ever sees concrete numbers.
 */
export function resolveBoxShadowInput(
  input: BoxShadowInput | undefined,
): ResolvedBoxShadowLayer[] {
  if (input === undefined) return []
  if (typeof input === 'string') return parseBoxShadow(input)
  return input.map((layer) => ({
    offsetX: coerceLength(layer.offsetX, 'offsetX'),
    offsetY: coerceLength(layer.offsetY, 'offsetY'),
    blurRadius: coerceLength(layer.blurRadius, 'blurRadius'),
    spreadDistance: coerceLength(layer.spreadDistance, 'spreadDistance'),
    color: layer.color ?? 'black',
    inset: layer.inset ?? false,
  }))
}

/**
 * Pair up `from`/`to` layer lists for interpolation, CSS-transition style:
 * the shorter list is padded with an invisible layer (all lengths 0,
 * transparent color) matching the counterpart's `inset` flag. A genuine
 * `inset` mismatch between paired layers is not interpolable and throws.
 */
export function pairBoxShadowLayers(
  from: ResolvedBoxShadowLayer[],
  to: ResolvedBoxShadowLayer[],
): Array<{ from: ResolvedBoxShadowLayer; to: ResolvedBoxShadowLayer }> {
  const count = Math.max(from.length, to.length)
  const pairs: Array<{
    from: ResolvedBoxShadowLayer
    to: ResolvedBoxShadowLayer
  }> = []
  for (let i = 0; i < count; i++) {
    const a = from[i]
    const b = to[i]
    const fromLayer = a ?? invisibleLayer(b!.inset)
    const toLayer = b ?? invisibleLayer(a!.inset)
    if (fromLayer.inset !== toLayer.inset) {
      throw new Error(
        `[inertia] useShadow: boxShadow layer ${i} is 'inset' on one side ` +
          'but not the other — inset cannot be interpolated. Give both ' +
          'sides the same inset-ness (pad with a transparent layer if needed).',
      )
    }
    pairs.push({ from: fromLayer, to: toLayer })
  }
  return pairs
}

function invisibleLayer(inset: boolean): ResolvedBoxShadowLayer {
  return {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadDistance: 0,
    color: 'transparent',
    inset,
  }
}

/* ------------------------------------------------------------------ *
 * Declarative `animate={{ boxShadow }}` support
 *
 * The `useShadow` path above interpolates two endpoints itself, by
 * progress. The `animate` path instead hands the target to Reanimated's
 * own animation drivers, which have their own rules — the helpers below
 * exist to satisfy them on the JS thread so the worklet never does string
 * or structural work at frame time (Principle 8).
 * ------------------------------------------------------------------ */

/**
 * The interpolable half of a box-shadow layer: every field Reanimated can
 * drive, and nothing it can't.
 *
 * `inset` is deliberately absent. `withTiming` / `withSpring` recurse into
 * arrays and objects and animate each leaf, and a boolean leaf falls through
 * to the plain numeric path — `false + (false - false) * p` evaluates to `0`,
 * so an in-flight frame hands the native shadow a number where it expects a
 * boolean. Inset is instead carried alongside as a static per-layer flag (see
 * `SplitBoxShadow.insets`) and reattached when the style is emitted.
 */
export interface AnimatedBoxShadowLayer {
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadDistance: number
  color: string
}

/**
 * Resolved layers split into the part Reanimated animates and the part it
 * must not touch.
 *
 * `insets` is `null` — not an array of `false` — when no layer is inset, which
 * is the overwhelmingly common case. That lets the emitting worklet skip
 * reassembly entirely and pass the animated array straight through with zero
 * per-frame allocation.
 */
export interface SplitBoxShadow {
  layers: AnimatedBoxShadowLayer[]
  insets: boolean[] | null
}

/**
 * Accepted target shape on the `animate` surface: a CSS string or RN's own
 * `BoxShadowValue[]`, whose lengths may be numbers or px strings.
 *
 * Structurally this is RN's `boxShadow` style value. It is restated here
 * rather than imported so this module stays dependency-free and testable as a
 * pure function; `types.ts` is where the public-facing alias lives.
 */
export type BoxShadowInput =
  | string
  | ReadonlyArray<{
      offsetX: number | string
      offsetY: number | string
      // `unknown` because RN types this as `ColorValue | number` — a quirk of
      // its own declarations rather than a real capability. Coerced (and
      // rejected) by `coerceLength` like every other length.
      blurRadius?: unknown
      spreadDistance?: number | string | undefined
      color?: string | undefined
      inset?: boolean | undefined
    }>

/**
 * Coerce one RN length field to a number. RN's `BoxShadowValue` types its
 * lengths as `number | string` so `{ offsetX: '4px' }` is legal input; the
 * animated slot needs a plain number to interpolate. Unit handling matches
 * `parseBoxShadow` — px and unitless only, and anything else throws rather
 * than silently animating from a `NaN`.
 */
function coerceLength(value: unknown, field: string): number {
  if (value === undefined) return 0
  if (typeof value === 'number') return value
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!LENGTH.test(trimmed)) {
    throw new Error(
      `[inertia] boxShadow: ${field} must be a number or a px length, got ` +
        `${JSON.stringify(value)}.`,
    )
  }
  return parseFloat(trimmed)
}

/** Drop `inset`, leaving only the fields Reanimated may drive. */
function strip(layer: ResolvedBoxShadowLayer): AnimatedBoxShadowLayer {
  const { inset: _inset, ...rest } = layer
  return rest
}

/**
 * Record layer `i` as inset, materializing the flag list on first use so the
 * common all-outset case keeps `null` and costs the worklet nothing.
 */
function markInset(
  insets: boolean[] | null,
  i: number,
  count: number,
): boolean[] {
  const list = insets ?? new Array<boolean>(count).fill(false)
  list[i] = true
  return list
}

/**
 * Normalize a target into the shared-value seed shape. Used when the slot is
 * first populated (mount seed, static-style resting value).
 */
export function normalizeBoxShadow(input: BoxShadowInput): SplitBoxShadow {
  const resolved = resolveBoxShadowInput(input)
  const layers: AnimatedBoxShadowLayer[] = []
  let insets: boolean[] | null = null
  for (let i = 0; i < resolved.length; i++) {
    const layer = resolved[i]!
    layers.push(strip(layer))
    if (layer.inset) insets = markInset(insets, i, resolved.length)
  }
  return { layers, insets }
}

/**
 * Prepare a from/to pair for a Reanimated-driven `boxShadow` animation.
 *
 * Both sides come back padded to the same layer count, because Reanimated's
 * `arrayOnStart` walks the **current** value's indices and reads `toValue[i]`
 * for each — a target with fewer layers leaves the surplus leaves with
 * `toValue: undefined`, and a target with more never animates the extras at
 * all. `pairBoxShadowLayers` supplies the padding (a transparent zero layer,
 * matching CSS transition semantics) and rejects a genuine inset mismatch.
 *
 * The returned `from` is only meaningful when it differs from what the slot
 * already holds; callers snap the slot to it before starting the animation so
 * the interpolation has a same-shaped base to run from.
 */
export function prepareBoxShadowAnimation(
  current: SplitBoxShadow,
  target: BoxShadowInput,
): {
  from: AnimatedBoxShadowLayer[]
  to: AnimatedBoxShadowLayer[]
  insets: boolean[] | null
} {
  const pairs = pairBoxShadowLayers(
    current.layers.map((layer, i) => ({
      ...layer,
      inset: current.insets?.[i] ?? false,
    })),
    resolveBoxShadowInput(target),
  )
  const from: AnimatedBoxShadowLayer[] = []
  const to: AnimatedBoxShadowLayer[] = []
  let insets: boolean[] | null = null
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!
    from.push(strip(pair.from))
    to.push(strip(pair.to))
    // `pairBoxShadowLayers` has already established that the two sides agree
    // on inset, so reading either describes the pair.
    if (pair.to.inset) insets = markInset(insets, i, pairs.length)
  }
  return { from, to, insets }
}
