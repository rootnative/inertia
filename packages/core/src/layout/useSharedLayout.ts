import {
  type MutableRefObject,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { type LayoutChangeEvent } from 'react-native'
import {
  type SharedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { DEFAULT_SPRING, springToReanimated } from '../transitions/spring'
import { type SpringTransition, type TransitionConfig } from '../types'
import {
  consumeLayout,
  registerLayout,
  releaseLayout,
  type SharedRect,
} from './sharedRegistry'

/**
 * Shared values produced by `useSharedLayout`. The worklet inside
 * `createMotionComponent` appends `translateX/Y` and `scaleX/Y` transforms
 * built from these so a shared-layout source rect maps onto the new
 * element's transform stack without conflicting with the user's `animate`
 * transforms — multiple transform entries of the same key compose
 * additively (for translates) and multiplicatively (for scales), which is
 * exactly the FLIP semantic.
 *
 * At rest the values are `(0, 0, 1, 1)` — the identity transform — so when
 * no shared-layout transition is active the worklet's contribution is a
 * no-op.
 */
export interface SharedLayoutValues {
  dx: SharedValue<number>
  dy: SharedValue<number>
  sx: SharedValue<number>
  sy: SharedValue<number>
}

/** What the host component needs to wire into its rendered tree. */
export interface SharedLayoutBindings {
  flip: SharedLayoutValues
  /**
   * Composite ref the consumer attaches to the rendered animated
   * component. Forwards the underlying ref to the user-supplied `ref`
   * (when present); kept as a stable callback so a `<Motion.*>` with no
   * `layoutId` doesn't pay anything extra.
   */
  setRef: (node: unknown) => void
  /** onLayout handler the consumer must attach to the animated component. */
  onLayout: (event: LayoutChangeEvent) => void
}

/**
 * Hook backing `<Motion.* layoutId="..." />`.
 *
 * Responsibilities, in order:
 *   1. Allocate FLIP shared values (identity at rest).
 *   2. Track the latest layout rect via the `onLayout` event, and push it
 *      into the registry under `layoutId` so this primitive can serve as
 *      the source for a future transition.
 *   3. On unmount, hand the last measured rect to `releaseLayout` so the
 *      next mount with the same id can consume it.
 *   4. On the first layout commit, consume any pending source rect and
 *      drive the FLIP shared values: snap them to the (delta, scale) that
 *      visually places the new element at the source position, then
 *      animate back to identity. `withSequence(snap, animate)` keeps the
 *      animation starting from the snapped delta rather than from zero.
 *
 * Coordinate space note: rects are in parent-relative coordinates (what
 * `onLayout` reports). For the common cross-screen navigator pattern —
 * both screens share an outer content container — parent-relative deltas
 * match what the user perceives. Nested-parent setups where the source
 * and target screens sit under containers at different screen offsets
 * will be off by that offset; v1 documents this and leaves a precise
 * window-coords path for v2.
 *
 * When `layoutId` is `undefined`, every callback is a no-op and the FLIP
 * shared values stay at identity — the host's worklet then skips the
 * transform contribution entirely.
 */
export function useSharedLayout(options: {
  layoutId: string | undefined
  userRef: Ref<unknown> | undefined
  transition: TransitionConfig | undefined
  shouldReduceMotion: boolean
  userOnLayout: ((event: LayoutChangeEvent) => void) | undefined
}): SharedLayoutBindings {
  const { layoutId, userRef, transition, shouldReduceMotion, userOnLayout } =
    options

  const dx = useSharedValue(0)
  const dy = useSharedValue(0)
  const sx = useSharedValue(1)
  const sy = useSharedValue(1)

  // Most-recent rect for this primitive. Updated on every layout commit;
  // read on unmount to populate the registry as the FLIP source for the
  // next mount with the same id.
  const lastRectRef = useRef<SharedRect | null>(null)

  // First-layout latch — only the first measurement after a fresh mount
  // can consume a source rect. Subsequent layouts (resizes, prop changes)
  // refresh the registry but never re-trigger a FLIP from an old source.
  const consumedRef = useRef(false)

  const transitionRef = useRef(transition)
  transitionRef.current = transition
  const reducedMotionRef = useRef(shouldReduceMotion)
  reducedMotionRef.current = shouldReduceMotion

  const setRef = useCallback(
    (node: unknown) => {
      if (typeof userRef === 'function') userRef(node)
      else if (userRef) (userRef as MutableRefObject<unknown>).current = node
    },
    [userRef],
  )

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      userOnLayout?.(event)
      if (!layoutId) return

      const { x, y, width, height } = event.nativeEvent.layout
      const rect: SharedRect = { x, y, width, height }
      lastRectRef.current = rect

      // First-layout-only: read the registry BEFORE writing our own rect
      // so a previously-released source rect can be consumed cleanly
      // without being overwritten by the current rect first.
      let source: SharedRect | undefined
      if (!consumedRef.current) {
        consumedRef.current = true
        source = consumeLayout(layoutId)
      }
      registerLayout(layoutId, rect)

      if (source) {
        applyFlip({
          source,
          target: rect,
          dx,
          dy,
          sx,
          sy,
          transition: transitionRef.current,
          shouldReduceMotion: reducedMotionRef.current,
        })
      }
    },
    // dx/dy/sx/sy are stable refs from useSharedValue, but eslint's
    // exhaustive-deps would flag them — including them is harmless and
    // silences the warning.
    [layoutId, userOnLayout, dx, dy, sx, sy],
  )

  // Reset the first-layout latch when the id changes — a new id is logically
  // a new shared-element identity and should be allowed to consume a source.
  useEffect(() => {
    consumedRef.current = false
  }, [layoutId])

  // On unmount, hand the latest rect to the registry under this id so the
  // next mount can consume it as a FLIP source.
  useEffect(() => {
    return () => {
      if (!layoutId) return
      const rect = lastRectRef.current
      if (!rect) return
      releaseLayout(layoutId, rect)
    }
  }, [layoutId])

  return useMemo<SharedLayoutBindings>(
    () => ({
      flip: { dx, dy, sx, sy },
      setRef,
      onLayout,
    }),
    [dx, dy, sx, sy, setRef, onLayout],
  )
}

/**
 * Snap the FLIP shared values so the new element visually overlays its
 * source rect, then animate back to identity. The `withSequence(snap,
 * animate)` shape is what makes the spring start from the snapped delta —
 * a plain `withSpring(0)` from a zero base would animate from-zero, not
 * from-source.
 */
function applyFlip(args: {
  source: SharedRect
  target: SharedRect
  dx: SharedValue<number>
  dy: SharedValue<number>
  sx: SharedValue<number>
  sy: SharedValue<number>
  transition: TransitionConfig | undefined
  shouldReduceMotion: boolean
}): void {
  const { source, target, dx, dy, sx, sy, transition, shouldReduceMotion } =
    args

  // Compute the delta that would visually place the new element at the
  // source rect. The transform origin matters: RN scales around the
  // element's center, so the translation needs to account for the
  // center-of-source vs center-of-target offset, not the top-left offset.
  const sourceCenterX = source.x + source.width / 2
  const sourceCenterY = source.y + source.height / 2
  const targetCenterX = target.x + target.width / 2
  const targetCenterY = target.y + target.height / 2
  const deltaX = sourceCenterX - targetCenterX
  const deltaY = sourceCenterY - targetCenterY
  // Guard against zero-sized targets (degenerate layout) — keep scale at 1
  // so the element at least renders even if the FLIP isn't a perfect match.
  const scaleX = target.width > 0 ? source.width / target.width : 1
  const scaleY = target.height > 0 ? source.height / target.height : 1

  if (shouldReduceMotion) {
    // Reduced-motion: skip the visual transition entirely. The element
    // appears at its natural position; the source rect is discarded.
    dx.value = 0
    dy.value = 0
    sx.value = 1
    sy.value = 1
    return
  }

  if (transition?.type === 'no-animation') {
    dx.value = 0
    dy.value = 0
    sx.value = 1
    sy.value = 1
    return
  }

  if (transition?.type === 'timing') {
    const duration = transition.duration ?? 300
    dx.value = withSequence(
      withTiming(deltaX, { duration: 0 }),
      withTiming(0, { duration }),
    )
    dy.value = withSequence(
      withTiming(deltaY, { duration: 0 }),
      withTiming(0, { duration }),
    )
    sx.value = withSequence(
      withTiming(scaleX, { duration: 0 }),
      withTiming(1, { duration }),
    )
    sy.value = withSequence(
      withTiming(scaleY, { duration: 0 }),
      withTiming(1, { duration }),
    )
    return
  }

  // Spring path (default, and the fallback for `'decay'` which doesn't
  // have a meaningful target value for a FLIP transition).
  const springCfg: SpringTransition =
    transition?.type === 'spring'
      ? { ...DEFAULT_SPRING, ...transition }
      : { type: 'spring', ...DEFAULT_SPRING }
  const springParams = springToReanimated(springCfg)

  dx.value = withSequence(
    withTiming(deltaX, { duration: 0 }),
    withSpring(0, springParams),
  )
  dy.value = withSequence(
    withTiming(deltaY, { duration: 0 }),
    withSpring(0, springParams),
  )
  sx.value = withSequence(
    withTiming(scaleX, { duration: 0 }),
    withSpring(1, springParams),
  )
  sy.value = withSequence(
    withTiming(scaleY, { duration: 0 }),
    withSpring(1, springParams),
  )
}
