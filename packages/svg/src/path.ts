/**
 * SVG path-string utilities used by `MotionSvg.Path`. Everything here runs on
 * the JS thread — paths are tokenized into a normalized command list at mount
 * and when `animate.d` changes; the worklet only ever consumes flat number
 * arrays + a frozen command template.
 *
 * Path morphing in v0.2 requires **structural compatibility**: the source and
 * every target `d` must produce the same command sequence (same command
 * letters, in the same order, after implicit-repeat expansion). Element-wise
 * numeric interpolation is the entire morphing model — we do not resample
 * paths or insert/remove commands. Same-shape morphs (e.g. a heart breathing,
 * a chevron flipping, a check mark tracing in) are the supported use case.
 */

/** Arg count per SVG path command. `Z`/`z` close the subpath and take none. */
const CMD_ARGS: Readonly<Record<string, number>> = {
  M: 2,
  m: 2,
  L: 2,
  l: 2,
  H: 1,
  h: 1,
  V: 1,
  v: 1,
  C: 6,
  c: 6,
  S: 4,
  s: 4,
  Q: 4,
  q: 4,
  T: 2,
  t: 2,
  A: 7,
  a: 7,
  Z: 0,
  z: 0,
}

/**
 * After an explicit `M`/`m` the SVG spec says additional coordinate pairs are
 * implicit `L`/`l` commands. Every other command repeats itself.
 */
const CMD_REPEAT: Readonly<Record<string, string>> = {
  M: 'L',
  m: 'l',
}

/**
 * A single normalized path command after implicit-repeat expansion. The cmd
 * letter is preserved (absolute vs relative — case is meaningful to the SVG
 * renderer). `args` always has exactly `CMD_ARGS[cmd]` entries.
 */
export interface PathSegment {
  cmd: string
  args: number[]
}

const isDigit = (c: string): boolean => c >= '0' && c <= '9'

/**
 * Tokenize a path `d` string into a stream of (command-letter | number)
 * tokens. Handles SVG's "compact" number forms — adjacent numbers separated
 * only by sign (`1-2`) or decimal point (`.5.6`) — so author-written paths
 * with mixed spacing all parse to the same tokens.
 */
function tokenize(d: string): Array<string | number> {
  const out: Array<string | number> = []
  const len = d.length
  let i = 0
  while (i < len) {
    const c = d[i]!
    // SVG path whitespace + comma separators.
    if (c === ' ' || c === ',' || c === '\t' || c === '\n' || c === '\r') {
      i++
      continue
    }
    // Command letter — any ASCII letter not adjacent to a number context.
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
      if (!(c in CMD_ARGS)) {
        throw new Error(
          `[inertia-svg] unknown path command '${c}' at position ${i}`,
        )
      }
      out.push(c)
      i++
      continue
    }
    // Number. Reaches here for digits, `.`, `+`, `-`.
    const start = i
    let hasDigit = false
    let hasDot = false
    if (c === '+' || c === '-') i++
    while (i < len) {
      const ch = d[i]!
      if (isDigit(ch)) {
        hasDigit = true
        i++
      } else if (ch === '.' && !hasDot) {
        hasDot = true
        i++
      } else {
        break
      }
    }
    if (hasDigit && (d[i] === 'e' || d[i] === 'E')) {
      i++
      if (d[i] === '+' || d[i] === '-') i++
      while (i < len && isDigit(d[i]!)) i++
    }
    if (!hasDigit) {
      throw new Error(
        `[inertia-svg] expected number at position ${start} in path '${d}', got '${c}'`,
      )
    }
    out.push(Number(d.substring(start, i)))
  }
  return out
}

/**
 * Parse a path `d` string into a flat list of normalized segments. Implicit
 * repeats are expanded — `M 0 0 10 10 20 20` becomes three segments
 * (`M 0 0`, `L 10 10`, `L 20 20`) so the segment list can be compared and
 * interpolated 1:1 against another path.
 */
export function parsePathD(d: string): PathSegment[] {
  const tokens = tokenize(d)
  const segments: PathSegment[] = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    if (typeof t !== 'string') {
      throw new Error(
        `[inertia-svg] expected command letter at token ${i}, got number ${t} — paths must start with a command`,
      )
    }
    const cmd = t
    const argCount = CMD_ARGS[cmd]!
    i++
    if (argCount === 0) {
      segments.push({ cmd, args: [] })
      continue
    }
    // First explicit batch for this command.
    const first: number[] = []
    for (let j = 0; j < argCount; j++) {
      const v = tokens[i++]
      if (typeof v !== 'number') {
        throw new Error(
          `[inertia-svg] command '${cmd}' expected ${argCount} numbers, got '${v}' at token ${i - 1}`,
        )
      }
      first.push(v)
    }
    segments.push({ cmd, args: first })
    // Repeated batches consume numbers up to the next command letter, applying
    // the implicit-repeat command (M → L, m → l, everything else → itself).
    // `argCount === 0` is handled above with an early continue, so the loop
    // body here always makes forward progress.
    const repeatCmd = CMD_REPEAT[cmd] ?? cmd
    while (i < tokens.length && typeof tokens[i] === 'number') {
      const batch: number[] = []
      for (let j = 0; j < argCount; j++) {
        const v = tokens[i++]
        if (typeof v !== 'number') {
          throw new Error(
            `[inertia-svg] command '${cmd}' (implicit repeat as '${repeatCmd}') expected ${argCount} numbers`,
          )
        }
        batch.push(v)
      }
      segments.push({ cmd: repeatCmd, args: batch })
    }
  }
  return segments
}

/**
 * The frozen "shape" of a path — just command letters and arg widths. Two
 * paths are morphable iff their templates are equal.
 */
export interface PathTemplate {
  cmds: ReadonlyArray<string>
  /** Flat width per segment, indexed parallel to `cmds`. */
  widths: ReadonlyArray<number>
  /** Total scalar count across all segments — `widths.reduce((a,b)=>a+b,0)`. */
  size: number
}

export function templateOf(segments: ReadonlyArray<PathSegment>): PathTemplate {
  const cmds = segments.map((s) => s.cmd)
  const widths = segments.map((s) => s.args.length)
  let size = 0
  for (let i = 0; i < widths.length; i++) size += widths[i]!
  return { cmds, widths, size }
}

/** Flatten a parsed segment list into a single number array (length === size). */
export function flattenParams(segments: ReadonlyArray<PathSegment>): number[] {
  const out: number[] = []
  for (let i = 0; i < segments.length; i++) {
    const args = segments[i]!.args
    for (let j = 0; j < args.length; j++) out.push(args[j]!)
  }
  return out
}

/**
 * Verify a target template matches the source. Returns `null` on match or a
 * descriptive error string on mismatch — callers throw in `__DEV__` and
 * silently snap to the target in production.
 */
export function diffTemplate(
  source: PathTemplate,
  target: PathTemplate,
): string | null {
  if (source.cmds.length !== target.cmds.length) {
    return `command count differs: source has ${source.cmds.length} segments, target has ${target.cmds.length}. Paths must produce the same command sequence after implicit-repeat expansion.`
  }
  for (let i = 0; i < source.cmds.length; i++) {
    if (source.cmds[i] !== target.cmds[i]) {
      return `command at segment ${i} differs: source '${source.cmds[i]}' vs target '${target.cmds[i]}'. Command letters (including case — absolute vs relative) must match.`
    }
  }
  return null
}

/**
 * Build a path `d` string from a template + flat param array. Runs inside the
 * worklet on the UI thread, so it must not capture any JS-thread closures or
 * use Array.prototype helpers that allocate intermediates the Hermes runtime
 * boxes into JS objects. Manual loops + `+=` string concat keep the worklet
 * cheap.
 *
 * MUST be a worklet — call sites in `MotionPath` wrap it with `'worklet'` via
 * `useAnimatedProps`.
 */
export function serializePath(
  template: PathTemplate,
  params: ReadonlyArray<number>,
): string {
  'worklet'
  let out = ''
  let p = 0
  for (let i = 0; i < template.cmds.length; i++) {
    out += template.cmds[i]
    const w = template.widths[i]!
    for (let j = 0; j < w; j++) {
      out += ' '
      out += params[p++]
    }
  }
  return out
}
