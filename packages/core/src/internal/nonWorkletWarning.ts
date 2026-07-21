declare const __DEV__: boolean

// The core package intentionally has no Node types — declare the minimal
// shape needed for the Jest detection below (guarded by a typeof check, so
// environments without `process` are fine).
declare const process: { env?: Record<string, string | undefined> } | undefined

const warned = new Set<string>()

/**
 * Dev-only, once-per-key warning for plain (non-worklet) functions handed to
 * surfaces that need real worklets — `useTransform` transformers and custom
 * `timing.easing` functions.
 *
 * Why this can't be papered over with an auto-wrap: wrapping a plain
 * function in a `'worklet'`-directive closure captures the *function
 * reference*, not the shared values it reads. Even when the consumer's
 * Babel plugin workletizes the wrapper, its `__closure` contains only the
 * opaque JS function — Reanimated cannot extract the shared values read
 * inside it as dependencies (so derived values never refresh), and native
 * builds reject the plain function when the closure is serialized to the UI
 * thread. The only correct authoring is the `'worklet'` directive on the
 * consumer's own function, where *their* Babel pass captures the real
 * closure.
 *
 * Suppressed under Jest: the shared Reanimated/worklets test stubs report
 * every function as non-worklet, which would turn the warning into noise in
 * every consumer's test suite.
 */
export function warnNonWorkletOnce(key: string, message: string): void {
  if (!__DEV__) return
  if (typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) return
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}

/** @internal — test-only hook to reset the once-per-key state. */
export function __resetNonWorkletWarningsForTests(): void {
  warned.clear()
}
