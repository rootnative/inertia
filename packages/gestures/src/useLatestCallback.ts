import { useCallback, useRef } from 'react'

/**
 * Return a function with a stable identity that always calls the latest
 * `fn`. The gesture hooks hand the returned function to `runOnJS` inside a
 * memoised gesture, so an inline callback in the options does not rebuild the
 * gesture on every render. Calling the result when `fn` is `undefined` is a
 * no-op.
 */
export function useLatestCallback<A extends unknown[]>(
  fn: ((...args: A) => void) | undefined,
): (...args: A) => void {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: A) => {
    ref.current?.(...args)
  }, [])
}
