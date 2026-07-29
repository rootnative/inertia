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
  cancelAnimation,
  type SharedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { DEFAULT_SPRING, springToReanimated } from '../transitions/spring'
import { type SpringTransition, type TransitionConfig } from '../types'
import { measureWindowRect } from './measureWindow'
import {
  consumeLayout,
  registerLayout,
  releaseLayout,
  type SharedLayoutSource,
  type SharedRect,
  type SharedStyleSnapshot,
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

/**
 * Shared values carrying the *style* half of a shared-element transition — the
 * part the rect FLIP can't express.
 *
 * `snapshot` parks the source element's values for the carried keys; `progress`
 * runs 1 → 0 on the same transition as the FLIP. The host's worklet reads both
 * and pulls each carried key from the snapshot toward its own resolved value,
 * so at the first frame the arriving element wears the source's colors and by
 * the last it wears its own.
 *
 * At rest `snapshot` is `null` and `progress` is 0, so the worklet's whole
 * contribution is one comparison.
 */
export interface SharedLayoutStyleValues {
  snapshot: SharedValue<SharedStyleSnapshot | null>
  progress: SharedValue<number>
}

/** What the host component needs to wire into its rendered tree. */
export interface SharedLayoutBindings {
  flip: SharedLayoutValues
  /** Source-style carry for the same transition. See `SharedLayoutStyleValues`. */
  carry: SharedLayoutStyleValues
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
 *   5. Carry the source's style values for the keys the rect can't express
 *      (colors, `opacity`, `borderRadius`) by parking them in a snapshot and
 *      running a crossfade progress 1 → 0 on the same transition. The blend
 *      happens in the host's worklet; see `SharedLayoutStyleValues`.
 *
 * Coordinate space: rects are recorded in **window** coordinates when the host
 * can be measured synchronously (Fabric), and in the parent-relative
 * coordinates `onLayout` reports when it can't (Paper, or a detached node).
 * Window coordinates are what let a source and target sitting under containers
 * at different screen offsets FLIP correctly — the case the original
 * parent-relative implementation got wrong. A source and target that ended up
 * in *different* spaces are not comparable, so the transition is skipped rather
 * than played wrongly. See `measureWindow.ts` for why there is no third,
 * asynchronous option.
 *
 * The source is re-measured at *consume* time when it is still mounted (the
 * usual case — a stack navigator keeps the previous screen alive underneath).
 * That is what stops a scrolled list from offsetting every transition by its
 * scroll distance: `onLayout` never fires for an ancestor's scroll, so the
 * stored rect drifts while the element itself has not moved relative to its
 * parent. See `SharedLayoutSource`.
 *
 * Known limitation: if the navigator has already begun translating the outgoing
 * screen by the time the target first lays out, re-measuring catches the source
 * mid-transition. The error is bounded by however far the transition has
 * progressed, which is far smaller than an unbounded scroll offset.
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
  /**
   * Read this element's current values for the carried style keys. Supplied by
   * the host (which owns the per-key shared values); `undefined` when the host
   * has nothing to carry. Identity may change every render — it is read through
   * a ref, so it never churns `onLayout`.
   */
  readStyles?: () => SharedStyleSnapshot | undefined
}): SharedLayoutBindings {
  const {
    layoutId,
    userRef,
    transition,
    shouldReduceMotion,
    userOnLayout,
    readStyles,
  } = options

  const dx = useSharedValue(0)
  const dy = useSharedValue(0)
  const sx = useSharedValue(1)
  const sy = useSharedValue(1)

  // Style-carry pair. `null` / 0 at rest means the host worklet skips the
  // whole branch on any element that isn't mid-transition.
  const snapshot = useSharedValue<SharedStyleSnapshot | null>(null)
  const carryProgress = useSharedValue(0)

  // Most-recent rect for this primitive. Updated on every layout commit;
  // read on unmount to populate the registry as the FLIP source for the
  // next mount with the same id.
  const lastRectRef = useRef<SharedRect | null>(null)

  // First-layout latch — only the first measurement after a fresh mount
  // can consume a source rect. Subsequent layouts (resizes, prop changes)
  // refresh the registry but never re-trigger a FLIP from an old source.
  const consumedRef = useRef(false)

  // The host node, captured off the composite ref so this element can be
  // measured in window coordinates — both for its own registry entry and when
  // a later mount asks it to re-measure as a FLIP source.
  const nodeRef = useRef<unknown>(null)

  const transitionRef = useRef(transition)
  transitionRef.current = transition
  const reducedMotionRef = useRef(shouldReduceMotion)
  reducedMotionRef.current = shouldReduceMotion
  const readStylesRef = useRef(readStyles)
  readStylesRef.current = readStyles

  const setRef = useCallback(
    (node: unknown) => {
      nodeRef.current = node
      if (typeof userRef === 'function') userRef(node)
      else if (userRef) (userRef as MutableRefObject<unknown>).current = node
    },
    [userRef],
  )

  // Offered to the registry while mounted so a later mount can ask for a
  // current measurement instead of trusting the one from our last layout.
  const remeasure = useCallback(() => measureWindowRect(nodeRef.current), [])

  // Same idea for the carried style keys: the host's values move without a
  // layout pass, so a consumer should read them now rather than trust the
  // snapshot from whenever we last laid out. Stable identity — the host's
  // reader is reached through a ref.
  const snapshotStyles = useCallback(() => readStylesRef.current?.(), [])

  const startTransition = useCallback(
    (
      source: SharedLayoutSource,
      sourceRect: SharedRect,
      target: SharedRect,
    ) => {
      // Mixed coordinate spaces are not comparable — the delta would be off by
      // the parent's window offset. Skipping is the honest outcome; playing
      // the animation anyway would fling the element in from the wrong place.
      // The style carry goes with it: half a shared-element transition reads
      // as a glitch, not as a graceful degradation.
      if (sourceRect.space !== target.space) return
      const shared = {
        transition: transitionRef.current,
        shouldReduceMotion: reducedMotionRef.current,
      }
      applyFlip({ source: sourceRect, target, dx, dy, sx, sy, ...shared })
      applyStyleCarry({
        snapshot,
        progress: carryProgress,
        // Prefer a live read for the same reason the rect is re-measured: a
        // still-mounted source may have moved on since its last layout.
        styles: source.readStyles?.() ?? source.styles,
        ...shared,
      })
    },
    [dx, dy, sx, sy, snapshot, carryProgress],
  )

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      userOnLayout?.(event)
      if (!layoutId) return

      const { x, y, width, height } = event.nativeEvent.layout

      // First-layout-only: read the registry BEFORE writing our own rect
      // so a previously-released source rect can be consumed cleanly
      // without being overwritten by the current rect first.
      let source: SharedLayoutSource | undefined
      if (!consumedRef.current) {
        consumedRef.current = true
        source = consumeLayout(layoutId)
      }

      // Window coordinates when the host can supply them synchronously,
      // otherwise the parent-relative rect this event carries. See
      // `measureWindow.ts` for why there is no third, asynchronous option.
      const rect: SharedRect =
        measureWindowRect(nodeRef.current) ??
        ({ x, y, width, height, space: 'parent' } as SharedRect)

      lastRectRef.current = rect
      registerLayout(layoutId, rect, remeasure, snapshotStyles)

      if (!source) return
      // Prefer a fresh measurement of the source over its stored rect: it may
      // have scrolled since its last layout, and `onLayout` never reports an
      // ancestor's scroll. Falls back to the stored rect once the source has
      // unmounted or when it can't be measured.
      startTransition(source, source.remeasure?.() ?? source.rect, rect)
    },
    [layoutId, userOnLayout, remeasure, snapshotStyles, startTransition],
  )

  // Reset the first-layout latch when the id changes — a new id is logically
  // a new shared-element identity and should be allowed to consume a source.
  useEffect(() => {
    consumedRef.current = false
  }, [layoutId])

  // On unmount, hand the latest rect — and a final snapshot of the carried
  // style keys — to the registry under this id so the next mount can consume
  // them. The styles are read by value here rather than left behind as a
  // callback: after this the node is gone, and a later read would be measuring
  // a component nobody owns.
  useEffect(() => {
    return () => {
      if (!layoutId) return
      const rect = lastRectRef.current
      if (!rect) return
      releaseLayout(layoutId, rect, snapshotStyles())
    }
  }, [layoutId, snapshotStyles])

  // Mark unmounted and stop any in-flight FLIP. The mounted flag is what keeps
  // an asynchronous measurement callback from writing to shared values the
  // component no longer owns; cancelling matches the guard the factory's own
  // per-key values and the value-layer hooks got in `0.0.2` — these four were
  // missed at the time.
  // Stop any in-flight FLIP on unmount. Matches the guard the factory's own
  // per-key values and the value-layer hooks got in `0.0.2` — these four were
  // missed at the time.
  useEffect(
    () => () => {
      cancelAnimation(dx)
      cancelAnimation(dy)
      cancelAnimation(sx)
      cancelAnimation(sy)
      // `snapshot` is assigned, never animated, so there is nothing to cancel
      // on it — only the progress value drives.
      cancelAnimation(carryProgress)
    },
    // The FLIP shared values are identity-stable per hook instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return useMemo<SharedLayoutBindings>(
    () => ({
      flip: { dx, dy, sx, sy },
      carry: { snapshot, progress: carryProgress },
      setRef,
      onLayout,
    }),
    [dx, dy, sx, sy, snapshot, carryProgress, setRef, onLayout],
  )
}

/**
 * Build the `withSequence(snap, animate)` pair every leg of a shared-element
 * transition uses: jump to `from` instantly, then animate to `to`. The snap leg
 * is what makes the animation start from the source — a plain `withSpring(to)`
 * off the resting base would animate from wherever the value already sat.
 *
 * Returned as a closure so the spring params are converted once and reused
 * across all five legs (four transforms plus the style crossfade), which also
 * guarantees the rect and the style land together.
 */
function legBuilder(
  transition: TransitionConfig | undefined,
): (from: number, to: number) => number {
  if (transition?.type === 'timing') {
    const duration = transition.duration ?? 300
    return (from, to) =>
      withSequence(
        withTiming(from, { duration: 0 }),
        withTiming(to, { duration }),
      )
  }
  // Spring path (default, and the fallback for `'decay'` which doesn't have a
  // meaningful target value for a FLIP transition).
  const springCfg: SpringTransition =
    transition?.type === 'spring'
      ? { ...DEFAULT_SPRING, ...transition }
      : { type: 'spring', ...DEFAULT_SPRING }
  const springParams = springToReanimated(springCfg)
  return (from, to) =>
    withSequence(
      withTiming(from, { duration: 0 }),
      withSpring(to, springParams),
    )
}

/**
 * Whether a shared-element transition should play at all, or snap. Reduced
 * motion and an explicit `'no-animation'` transition are the same answer for
 * both the rect and the style halves.
 */
function shouldSnap(
  transition: TransitionConfig | undefined,
  shouldReduceMotion: boolean,
): boolean {
  return shouldReduceMotion || transition?.type === 'no-animation'
}

/**
 * Snap the FLIP shared values so the new element visually overlays its
 * source rect, then animate back to identity.
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

  if (shouldSnap(transition, shouldReduceMotion)) {
    // Skip the visual transition entirely. The element appears at its natural
    // position; the source rect is discarded.
    dx.value = 0
    dy.value = 0
    sx.value = 1
    sy.value = 1
    return
  }

  const leg = legBuilder(transition)
  dx.value = leg(deltaX, 0)
  dy.value = leg(deltaY, 0)
  sx.value = leg(scaleX, 1)
  sy.value = leg(scaleY, 1)
}

/**
 * Park the source element's carried style values and run the crossfade
 * progress 1 → 0 on the same transition as the rect FLIP.
 *
 * The blend itself happens in the host's worklet, which pulls each carried key
 * from `snapshot[key]` toward its own resolved value by `progress`. Driving
 * only a scalar here is what keeps this cheap: one shared value moves, however
 * many keys are being carried, and colors go through the same
 * `interpolateColor` branch the gesture cascade already uses.
 *
 * A source with nothing to carry leaves both values alone — an element whose
 * counterpart declared no carried keys behaves exactly as it did before style
 * carry existed.
 */
function applyStyleCarry(args: {
  snapshot: SharedValue<SharedStyleSnapshot | null>
  progress: SharedValue<number>
  styles: SharedStyleSnapshot | undefined
  transition: TransitionConfig | undefined
  shouldReduceMotion: boolean
}): void {
  const { snapshot, progress, styles, transition, shouldReduceMotion } = args
  if (!styles) return

  if (shouldSnap(transition, shouldReduceMotion)) {
    // Matching the rect path: the element arrives wearing its own style rather
    // than crossfading into it. Clearing the snapshot too means the worklet's
    // branch stays untaken instead of resting on a dead payload.
    snapshot.value = null
    progress.value = 0
    return
  }

  snapshot.value = styles
  progress.value = legBuilder(transition)(1, 0)
}
