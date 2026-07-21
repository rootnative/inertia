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

/** Resolve either input form (CSS string or structured layers) to layers. */
export function resolveBoxShadowInput(
  input: string | readonly BoxShadowLayer[] | undefined,
): ResolvedBoxShadowLayer[] {
  if (input === undefined) return []
  if (typeof input === 'string') return parseBoxShadow(input)
  return input.map((layer) => ({
    offsetX: layer.offsetX,
    offsetY: layer.offsetY,
    blurRadius: layer.blurRadius ?? 0,
    spreadDistance: layer.spreadDistance ?? 0,
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
