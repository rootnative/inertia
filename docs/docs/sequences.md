---
sidebar_position: 5
description: 'Per-property keyframes and looping: arrays for sequence steps, and the unified repeat config on transitions.'
---

# Sequences and repeat

Per-property keyframes and loops use two related shapes: an array for the sequence steps, and the one `repeat` config on a transition.

## Keyframes

Pass an array as the value of an animatable key to step through the frames in order:

```tsx
<Motion.View
  animate={{
    translateX: [0, 100, 0],
    opacity: [0, 1],
  }}
/>
```

Each step inherits the transition of that key. A sequence runs on the UI thread and never goes through JS.

## Per-step transitions

Replace a step with `{ to, ...transitionOverride }` to give that step its own transition:

```tsx
<Motion.View
  animate={{
    opacity: [
      0,
      { to: 1, type: 'spring', tension: 200 },
      { to: 0, type: 'timing', duration: 300, delay: 500 },
    ],
  }}
/>
```

The key is `to`, not `value`, because a step describes a destination: "animate **to** this".

## Repeat

`repeat` is part of the transition, not of `animate`. It has one shape, with no separate `loop` or `repeatReverse` flags.

| Form                                       | Meaning                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `repeat: 3`                                | Run 3 iterations total, alternating direction. |
| `repeat: 'infinite'`                       | Loop forever, alternating direction.           |
| `repeat: { count: 3, alternate: false }`   | Full control. `alternate` defaults to `true`.  |
| `repeat: { count: 'infinite', alternate }` | Endless with explicit alternate flag.          |

```tsx
<Motion.View
  animate={{ translateX: [0, 80, 0] }}
  transition={{ type: 'timing', duration: 600, repeat: 'infinite' }}
/>
```

On a sequence, `repeat` wraps the **whole sequence**, not each step. A `repeat` inside a step applies only inside that step.

`count` is the total number of iterations, including the first pass, so `repeat: 2` plays the animation twice. A count below `1` runs the animation once and warns in dev. Inertia doesn't forward that count to Reanimated, which reads a count of `0` as endless.

`alternate` has no effect on a sequence. The `reverse` flag of Reanimated only swaps the target of the wrapped animation, and a sequence ignores that. Every pass starts again at the first step. To alternate, write the reverse steps into the sequence: `[0, 80, 0]` instead of `[0, 80]` with `alternate`. An explicit `alternate: true` on a sequence warns in dev.

A `'no-animation'` or `'decay'` config ignores `repeat`.

## Reduced motion

A sequence under the reduced-motion gate doesn't play. The property snaps to the **last keyframe**, where the sequence would end, and Inertia builds no `withSequence`. Inertia also drops `repeat` and `delay`, so an endless sequence rests and doesn't loop.

```tsx
// reduce-motion on at the OS level: opacity settles at 0.25, nothing animates.
<Motion.View animate={{ opacity: [0, 1, 0.25] }} />
```

Write the keyframes so that the last one is the state that a reduce-motion user must see. A loop that returns to its start (`[0, 80, 0]`) already does that. A loop written as one leg plus `alternate` can't, because [`alternate` has no effect on a sequence](#repeat). For a drift between two states, use one target and let `repeat` alternate it:

```tsx
// Oscillates between -8 and 0, and rests at 0 under reduced motion.
<Motion.View
  initial={{ translateY: -8 }}
  animate={{ translateY: 0 }}
  transition={{ type: 'timing', duration: 2600, repeat: 'infinite' }}
/>
```

See [`MotionConfig`](./motion-config) for how Inertia resolves the gate.

## `onAnimationEnd`

One callback reports the lifecycle of a sequence and of a repeat:

```tsx
<Motion.View
  animate={{ translateX: [0, 100, 0] }}
  transition={{ repeat: 2 }}
  onAnimationEnd={({
    key,
    finished,
    phase,
    step,
    iteration,
    value,
    target,
  }) => {
    // phase: 'step' | 'sequence' | 'repeat' | 'animation'
    // step:  index in the keyframe array, undefined for non-sequences
    // iteration: 0 on the first pass, 1 on the second, …
  }}
/>
```

| `phase`       | When it fires                                                         |
| ------------- | --------------------------------------------------------------------- |
| `'step'`      | A non-final step in a sequence settles.                               |
| `'sequence'`  | Last step of a non-final iteration — the sequence is about to repeat. |
| `'repeat'`    | A non-final iteration of a non-sequence animation completes.          |
| `'animation'` | The terminal phase of the property — no more passes will run.         |

A transform fires once per logical event, not once per axis. A `translateX` and `translateY` animation on the same primitive gives one callback for the transform, not two. When the terminal `'animation'` phase fires for a transform key, `key` is the sentinel `'transform'`. The mid-step events (`'step'`, `'sequence'`, `'repeat'`) still fire per axis, with the axis name (`'translateX'`, `'scale'`, and so on), because each step is its own logical event.

An endless axis is not part of that group. A property with `repeat: 'infinite'` never reaches `'animation'`: it emits `'repeat'` forever. So Inertia excludes it from the transform group, and it doesn't hold the group open. Give `translateX` an infinite repeat and `translateY` a finite one, and you still get the terminal `'transform'` callback when `translateY` lands. Make _every_ transform axis infinite, and no terminal callback fires, because nothing finishes.

The same rule protects [`<Presence>`](./presence). An endless `exit` animation never settles, so it doesn't gate the unmount. If every exiting property repeats forever, `Presence` removes the child at once. If some properties are finite, those still gate the unmount. A top-level `transition={{ repeat: 'infinite' }}` also applies to `exit`. If you also want a normal exit, scope the repeat to the property that must loop: `transition={{ opacity: { repeat: 'infinite' } }}`.
