/**
 * Test helpers for Inertia consumers.
 *
 * The Reanimated Jest mock that ships with the library is **static-render**:
 * `useAnimatedStyle` runs the worklet exactly once per call, and shared
 * values are plain `{ value }` refs. After the animation effect fires
 * (`sv.value = withSpring(target) → target` under the mock), the rendered
 * style has already been captured at the at-rest shared-value snapshot —
 * so without intervention, every Inertia component looks frozen at its
 * `initial` values in tests.
 *
 * `renderWithMotion` papers over that by forcing a second render after the
 * first effect pass. The shared values now hold their target values, so
 * `useAnimatedStyle` re-evaluates against the post-animation state and the
 * rendered styles match what a real device would settle on.
 *
 * Use this from `@rootnative/inertia/testing`:
 *
 * ```ts
 * import { renderWithMotion } from '@rootnative/inertia/testing'
 *
 * const { getByTestId } = renderWithMotion(
 *   <Motion.View testID="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />,
 * )
 * // getByTestId('card') has opacity: 1, not 0.
 * ```
 *
 * For tests that need to re-render with new props and re-flush, use
 * `flushMotion(result, nextUi)`.
 */
import { render, type RenderOptions } from '@testing-library/react-native'
import { cloneElement, type ReactElement } from 'react'

type RenderResult = ReturnType<typeof render>

/**
 * Render a Motion subtree and immediately flush animations to their target
 * values. Returns the standard `@testing-library/react-native` render result.
 *
 * Internally this calls `render(...)`, then re-renders the same element
 * inside `act(...)` so the post-effect shared-value updates flow into the
 * `useAnimatedStyle` re-run. Both passes happen synchronously — the call
 * returns once styles reflect the `animate` target.
 */
export function renderWithMotion(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  const result = render(ui, options)
  // `cloneElement` produces a fresh element with the same props so React
  // doesn't bail out of the second render via reference-equal short-circuit
  // — that's what causes `useAnimatedStyle` to skip its post-effect re-read
  // when the same element is passed to `rerender`.
  flushMotion(result, cloneElement(ui))
  return result
}

/**
 * Re-render a previously-mounted Motion subtree to flush pending animations
 * to their target values. Pass the same element you originally rendered
 * (or a new one for tests that update props between flushes).
 *
 * The flush is synchronous. `@testing-library/react-native`'s `rerender`
 * already wraps in `act` internally, so no explicit `act(...)` is needed
 * here.
 */
export function flushMotion(rendered: RenderResult, ui: ReactElement): void {
  // One re-render is enough for non-sequence animations: the mount-effect
  // has run, shared values now hold their target values, and the next
  // `useAnimatedStyle` invocation will read them. Sequence steps chain
  // through `withSpring` / `withTiming` settle callbacks — those are still
  // captured for tests that invoke them manually (see `onAnimationEnd.test`).
  //
  // `cloneElement` defeats React's reference-equal element bail-out so the
  // second render actually reaches `useAnimatedStyle` instead of being
  // short-circuited by the reconciler.
  rendered.rerender(cloneElement(ui))
}
