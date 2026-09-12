import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Platform } from 'react-native'
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { warnOnce } from '../internal/warnOnce'
import { measureWindowRect } from '../layout'
import { useScrollContext } from '../scroll'
import { type TransitionInput } from '../types'
import { useAnimation } from './useAnimation'

/** How many frames to keep retrying the first measurement before giving up. */
const MEASURE_ATTEMPTS = 5

export interface UseInViewOptions {
  /**
   * How much of the element must be visible before it counts as in view, as a
   * fraction of its own length along the scroll axis. `0` (the default) fires
   * as soon as one point of it is on screen; `1` waits for the whole element.
   *
   * An element longer than the container can never reach a high fraction, so
   * the requirement is capped at the container's own length — `amount: 1` on
   * an over-long element means "fills the container", not "never".
   */
  amount?: number
  /**
   * Keep the value at `1` once the element has been seen. Default `true`,
   * because the common case is an entrance animation and replaying it on every
   * scroll past reads as flicker. Pass `false` for a value that tracks
   * visibility both ways.
   */
  once?: boolean
  /**
   * Grow (positive) or shrink (negative) the detection box, in points.
   * Positive values fire the animation before the element reaches the edge of
   * the container.
   */
  margin?: number
  /**
   * How the value moves between `0` and `1`. Takes the same shapes as every
   * other transition — a config, or a `TransitionName` registered on the
   * nearest `<MotionConfig transitions>`. Defaults to the library spring, and
   * reduced motion snaps it.
   */
  transition?: TransitionInput
}

type MeasurableNode = { measureInWindow?: unknown }

/**
 * Drive a 0↔1 shared value from whether `ref`'s element is on screen.
 *
 * This is the missing **source** for the value layer: `useInterpolatedStyle`,
 * `useShadow`, and `useColorCascade` all take a progress value and let the
 * caller decide what drives it. `useInView` makes that driver "the user can
 * see this".
 *
 * ```tsx
 * const ref = useRef<View>(null)
 * const inView = useInView(ref)
 * const style = useInterpolatedStyle(inView, {
 *   opacity: [0, 1],
 *   translateY: [24, 0],
 * })
 *
 * return (
 *   <Motion.ScrollView>
 *     <Motion.View ref={ref} style={style} />
 *   </Motion.ScrollView>
 * )
 * ```
 *
 * ## What it needs to work
 *
 * On **web** it uses `IntersectionObserver` against the browser viewport, so
 * it needs nothing but the ref.
 *
 * On **native** there is no such API, so the element must sit inside a
 * `Motion.ScrollView` or a `Motion.FlatList`. Those publish their scroll
 * offset and their visible length, and this hook measures the element once and
 * then does the arithmetic on the UI thread. Nesting depth does not matter —
 * the measurement is in window coordinates, so an element any number of views
 * deep reports correctly.
 *
 * **Outside a scroll container on native the value is `1` from the start**, and
 * the hook warns once in dev. That is the honest fallback: an element on a
 * fixed screen really is visible, and the animation then behaves exactly as it
 * did before this hook existed. It is not a substitute for a scroll container.
 *
 * ## What it does not do
 *
 * The element is measured on mount and again when the container resizes. It is
 * **not** re-measured when content above it changes height, so a list that
 * grows above an element can leave that element's trigger point stale. Remount
 * it (change its `key`) if the layout above it moves.
 *
 * @param ref A ref on the element to watch. On web it must land on a host
 *   component, which is what `Motion.*` and RN's own primitives give you.
 */
export function useInView(
  ref: RefObject<unknown>,
  options?: UseInViewOptions,
): SharedValue<number> {
  const { amount = 0, once = true, margin = 0, transition } = options ?? {}

  const [inView, setInView] = useState(false)
  const scroll = useScrollContext()

  // `once` is read through a ref so flipping it does not re-run detection, and
  // so the worklet's JS-thread callback never closes over a stale value.
  const seen = useRef(false)
  // The last value actually reported. Detection can re-assert an unchanged
  // answer — a scroll that moves the element without crossing the threshold
  // does it on every frame — and a `setState` per frame with the same value is
  // pure churn. It is also what keeps the reaction from looping under the Jest
  // mock, which re-runs it on every render with no previous value.
  const current = useRef(false)
  const report = useCallback(
    (next: boolean) => {
      if (seen.current && once) return
      if (current.current === next) return
      current.current = next
      if (next) seen.current = true
      setInView(next)
    },
    [once],
  )

  // The element's position and length along the scroll axis, both measured
  // once and then held on the UI thread. `start` is where the element sat
  // inside the container's visible box at the moment `baseline` was the
  // container's scroll offset; the reaction below tracks it from there.
  const start = useSharedValue(0)
  const size = useSharedValue(0)
  const baseline = useSharedValue(0)
  const measured = useSharedValue(false)
  // The container's length taken from the same measurement pass. The context
  // carries the authoritative value, but only from the container's first
  // layout event — and an element can mount, measure, and need an answer
  // before that lands. Measuring both boxes together means one source is
  // enough to decide.
  const measuredViewport = useSharedValue(0)

  const isWeb = Platform.OS === 'web'

  // The worklet below may capture only shared values and plain data. The
  // context value itself carries `getNode`, an ordinary JS function, and
  // capturing that object whole fails to serialize to the UI thread on
  // native — so the two shared values are pulled out here. `zero` stands in
  // when there is no container, which keeps the hook order fixed.
  const zero = useSharedValue(0)
  const offset = scroll?.offset ?? zero
  const length = scroll?.length ?? zero
  const horizontal = scroll?.horizontal ?? false

  const measure = useCallback(() => {
    const node = ref.current as MeasurableNode | null
    const container = scroll?.getNode()
    if (!node || !container) return false

    const element = measureWindowRect(node)
    const box = measureWindowRect(container)
    if (!element || !box) return false

    // Both rects are window coordinates, so the difference is the element's
    // offset inside the container's visible box — no assumption about which
    // coordinate space `measureLayout` would have used, and correct however
    // deeply the element is nested.
    start.value = horizontal ? element.x - box.x : element.y - box.y
    size.value = horizontal ? element.width : element.height
    measuredViewport.value = horizontal ? box.width : box.height
    baseline.value = offset.value
    measured.value = true
    return true
    // The shared values are identity-stable per hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, scroll, horizontal])

  // ─── Native: measure once, then track the scroll offset on the UI thread ──
  useEffect(() => {
    if (isWeb || !scroll) return

    // A node is not measurable on the frame it mounts, and on Paper
    // `measureInWindow` may never answer synchronously at all. Retry for a few
    // frames, then stop — a hook that polls forever is worse than one that
    // gives up.
    let frame: ReturnType<typeof requestAnimationFrame> | undefined
    let attempts = 0
    const attempt = () => {
      if (measure()) return
      if (++attempts >= MEASURE_ATTEMPTS) {
        // Nothing was measurable, so no scroll arithmetic is possible. Reveal
        // rather than leave the element stuck at 0 forever.
        report(true)
        return
      }
      frame = requestAnimationFrame(attempt)
    }
    frame = requestAnimationFrame(attempt)

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [isWeb, scroll, measure, report])

  const trackScroll = !isWeb && scroll !== null

  useAnimatedReaction(
    () => {
      'worklet'
      // `null` means "this hook is not the one deciding" — on web the observer
      // below owns the answer, and before the first measurement there is no
      // answer. Returning `false` instead would fight the other path.
      if (!trackScroll || !measured.value) return null
      const viewport = length.value > 0 ? length.value : measuredViewport.value
      if (viewport <= 0 || size.value <= 0) return null

      const top = start.value - (offset.value - baseline.value)
      const visible =
        Math.min(top + size.value, viewport + margin) - Math.max(top, -margin)
      if (visible <= 0) return false

      // Cap the requirement at the container: an element longer than the
      // viewport would otherwise never satisfy a high `amount`.
      const required = Math.min(amount * size.value, viewport)
      return visible >= required
    },
    (next, previous) => {
      'worklet'
      if (next === null || next === previous) return
      runOnJS(report)(next)
    },
    [trackScroll, amount, margin, offset, length, measuredViewport],
  )

  // ─── Web: IntersectionObserver, which needs no scroll container ───────────
  useEffect(() => {
    if (!isWeb) return

    const node = ref.current
    if (typeof IntersectionObserver === 'undefined' || !node) {
      report(true)
      return
    }

    // The container's own node is the better root when there is one, because
    // the browser viewport says nothing about an element scrolled out of an
    // inner scroller. Fall back to the viewport when it is not a DOM element —
    // react-native-web does not promise that every ref is one.
    const container = scroll?.getNode()
    const root =
      typeof Element !== 'undefined' && container instanceof Element
        ? container
        : null

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) report(entry.isIntersecting)
      },
      {
        root,
        // Same sign convention as ours: a positive margin grows the box the
        // observer tests against, so the element counts as visible earlier.
        rootMargin: `${margin}px`,
        threshold: Math.min(Math.max(amount, 0), 1),
      },
    )
    observer.observe(node as Element)

    return () => observer.disconnect()
  }, [isWeb, ref, scroll, amount, margin, report])

  // ─── No detection is possible: say so once, and reveal ────────────────────
  useEffect(() => {
    if (isWeb || scroll) return
    warnOnce(
      'use-in-view-no-container',
      '[inertia] useInView found no Motion.ScrollView or Motion.FlatList above it. ' +
        'On native it needs one to read a scroll offset, so the value stays at 1 ' +
        '(the element is treated as visible). Wrap the scrolling area in a Motion ' +
        'primitive, or drop the hook if the element never scrolls.',
    )
    report(true)
  }, [isWeb, scroll, report])

  return useAnimation(inView ? 1 : 0, transition)
}
