declare const __DEV__: boolean

const warned = new Set<string>()

/**
 * Dev-only warning that fires at most once per `key` for the lifetime of the
 * module.
 *
 * Inertia's warnings mostly fire from render or from a per-frame-adjacent
 * resolver, so an unguarded `console.warn` would repeat on every render and
 * bury the signal. Keying the guard (rather than using a single boolean)
 * keeps two genuinely different misconfigurations from silencing each other.
 *
 * Unlike `warnNonWorkletOnce`, this is **not** suppressed under Jest — these
 * warnings describe consumer-authored prop combinations, which a test suite
 * should be able to assert on.
 */
export function warnOnce(key: string, message: string): void {
  if (!__DEV__) return
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}

/** @internal — test-only hook to reset the once-per-key state. */
export function __resetWarnOnceForTests(): void {
  warned.clear()
}
