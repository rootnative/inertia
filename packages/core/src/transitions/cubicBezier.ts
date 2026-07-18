import { Easing } from 'react-native-reanimated'
import { type EasingInput } from '../types'

/**
 * The CSS easing keywords and their canonical cubic-bezier control points
 * (W3C css-easing-1). `linear` is special-cased to Reanimated's identity
 * easing rather than a degenerate bezier.
 */
const CSS_KEYWORDS: Record<string, readonly [number, number, number, number]> =
  {
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
  }

const CSS_FUNCTION = /^cubic-bezier\((.*)\)$/

/**
 * Build a `timing.easing` value from cubic-bezier control points — as four
 * numbers, as a W3C CSS `cubic-bezier(...)` string, or as a CSS easing
 * keyword. Design systems store easing tokens in the CSS format; this helper
 * makes any such token file directly consumable without hand-translating to
 * `Easing.bezier` calls:
 *
 * ```ts
 * cubicBezier(0.2, 0, 0, 1)                  // number form
 * cubicBezier('cubic-bezier(0.2, 0, 0, 1)')  // CSS token form
 * cubicBezier('ease-out')                    // CSS keywords, incl. 'linear'
 * ```
 *
 * The return value is exactly what `timing.easing` accepts (Reanimated's
 * bezier factory; the resolver worklet-wraps it via `ensureWorkletEasing`
 * like every other easing input), so it works in the `transition` prop, in
 * named transitions registered on `<MotionConfig transitions>`, and in the
 * value-layer hooks:
 *
 * ```tsx
 * <MotionConfig
 *   transitions={{
 *     'state-hover': {
 *       type: 'timing',
 *       duration: 150,
 *       easing: cubicBezier(theme.motion.easingStandard),
 *     },
 *   }}
 * >
 * ```
 *
 * Invalid input **throws** rather than warning: easing tokens are constructed
 * at theme/module setup, and a malformed token should fail loudly there, not
 * silently animate with the wrong curve. Per the CSS spec, `x1` / `x2` must
 * be within `[0, 1]` (`y1` / `y2` are unrestricted). The stepping keywords
 * (`step-start` / `step-end`) and the CSS `linear(...)` function are not
 * easing curves this helper produces — they're intentionally unsupported.
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): EasingInput
export function cubicBezier(css: string): EasingInput
export function cubicBezier(
  first: number | string,
  y1?: number,
  x2?: number,
  y2?: number,
): EasingInput {
  if (typeof first === 'string') return fromCss(first)
  return bezier(first, y1 as number, x2 as number, y2 as number, undefined)
}

function fromCss(input: string): EasingInput {
  const token = input.trim().toLowerCase()
  if (token === 'linear') return Easing.linear
  const keyword = CSS_KEYWORDS[token]
  if (keyword) return bezier(...keyword, input)
  const match = CSS_FUNCTION.exec(token)
  if (!match) {
    throw new Error(
      `[inertia] cubicBezier: unsupported easing token ${JSON.stringify(input)}. ` +
        `Expected four numbers, a 'cubic-bezier(x1, y1, x2, y2)' string, or ` +
        `one of the CSS keywords 'linear' | 'ease' | 'ease-in' | 'ease-out' ` +
        `| 'ease-in-out'.`,
    )
  }
  const parts = match[1]!.split(',').map((p) => Number(p.trim()))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(
      `[inertia] cubicBezier: could not parse ${JSON.stringify(input)} — ` +
        `expected exactly four finite numbers inside cubic-bezier(...).`,
    )
  }
  return bezier(parts[0]!, parts[1]!, parts[2]!, parts[3]!, input)
}

function bezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  source: string | undefined,
): EasingInput {
  const describe = () =>
    source !== undefined
      ? JSON.stringify(source)
      : `cubicBezier(${x1}, ${y1}, ${x2}, ${y2})`
  for (const n of [x1, y1, x2, y2]) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new Error(
        `[inertia] cubicBezier: ${describe()} — every control point must be ` +
          `a finite number.`,
      )
    }
  }
  // CSS (and the underlying bezier solver) require the curve to be a function
  // of time: x1 / x2 within [0, 1]. y values are unrestricted (overshoot).
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new Error(
      `[inertia] cubicBezier: ${describe()} — x1 and x2 must be within ` +
        `[0, 1] (got x1=${x1}, x2=${x2}).`,
    )
  }
  return Easing.bezier(x1, y1, x2, y2)
}
