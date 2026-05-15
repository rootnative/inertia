---
sidebar_position: 11
---

# Layout

The `layout` prop animates position and size changes that come from outside the `animate` flow — a flex sibling growing, a list reordering, a column toggling its width. Without it, those changes snap; with it, they interpolate.

```tsx
import { Motion } from '@onlynative/inertia'

function ReorderableRow({ item, onPress }: Props) {
  return (
    <Motion.View
      layout={{ type: 'spring', tension: 200, friction: 22 }}
      style={styles.row}
    />
  )
}
```

Internally the prop resolves to Reanimated's `LinearTransition` builder; the same react-spring vocabulary (`tension`, `friction`, `mass`) you use for `transition` works here too. Raw Reanimated names (`stiffness` / `damping`) never appear on the public API.

## Accepted shapes

| Value              | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| omitted / `false`  | No layout animation. Position and size changes snap (default).                                  |
| `true`             | Library default spring (`tension: 170`, `friction: 26`, `mass: 1`).                             |
| `TransitionConfig` | `'spring'` or `'timing'`. `'decay'` downgrades to spring; `'no-animation'` skips the animation. |

```tsx
<Motion.View layout />                                          // default spring
<Motion.View layout={{ type: 'spring', tension: 240 }} />        // custom spring
<Motion.View layout={{ type: 'timing', duration: 320 }} />       // duration-based
<Motion.View layout={{ type: 'timing', easing: (t) => t * t }} /> // custom easing
```

User-supplied easing functions are auto-wrapped with the `'worklet'` directive at JS time, same as `transition.easing` — you don't need to remember the worklet boundary.

## What triggers a layout animation

`LinearTransition` fires whenever the underlying native view's measured frame changes between commits. The common triggers:

- The component's siblings reorder in a flex container.
- The component's size changes because its `style` props swap (`height: 56` ↔ `height: 96`).
- The component's position shifts because a sibling grew, shrank, or was inserted.

The `animate` flow is independent. A `Motion.View` can have both `animate={{ opacity }}` and `layout` — the opacity drives through `useAnimatedStyle`, the layout drives through Reanimated's native commit hook. They don't fight.

## Reduced motion

`layout` participates in [`<MotionConfig reducedMotion>`](./motion-config.md) — when reduced motion is active, the prop resolves to no builder and changes snap. We pass `undefined` to the underlying component rather than a `.duration(0)` builder because Reanimated still runs commit-tracking machinery in the latter case; the snap path is genuinely cheaper.

## What this prop doesn't do (yet)

- **Shared element transitions across screens (`layoutId`)** — Reanimated 4 dropped the `sharedTransitionTag` API the previous design relied on. A measure-based Inertia-side registry is the in-flight replacement, but it ships separately.
- **Per-axis control (`layout="position"` / `layout="size"`)** — `LinearTransition` doesn't expose an axis filter; the whole frame animates together. If you need to gate a specific dimension, animate it through `animate` instead.
- **Layout-tied callbacks** — `onAnimationEnd` fires for `animate` keys, not for layout commits. Reanimated's `withCallback` is what backs that on the layout side; we haven't surfaced it yet.

## Caveats

- The wrapped component must render a native host view. Every `Motion.*` primitive does; if you wrap a custom component via `createMotionComponent(C)`, ensure `C` ultimately renders a host view, or the prop is a no-op.
- Layout animations on virtualized list items (FlatList rows) can fight the list's own measurement passes — measure twice before adding `layout` to row components. The [Perf bench](./perf-bench.md) screen is the place to test.
