---
sidebar_position: 5
description: "Per-property keyframes and looping: arrays for sequence steps, and the unified repeat config on transitions."
---

# Sequences and repeat

Per-property keyframes and looping live in two related shapes: arrays for sequence steps, and the unified `repeat` config on transitions.

## Keyframes

Pass an array as the value of any animatable key to step through frames in order:

```tsx
<Motion.View
  animate={{
    translateX: [0, 100, 0],
    opacity: [0, 1],
  }}
/>
```

Each step inherits the transition that's in effect for that key. Sequences run on the UI thread without bouncing through JS.

## Per-step transitions

Replace any step with `{ to, ...transitionOverride }` to tune that step's physics independently:

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

We use `to` (not `value`) because steps describe a destination — "animate **to** this".

## Repeat

`repeat` lives on the transition, not on `animate`. One shape, no `loop` / `repeatReverse` cousins.

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

When applied to a sequence, repeat wraps the **whole sequence**, not each step. Per-step `repeat` overrides remain step-local — they apply only inside that step.

`'no-animation'` and `'decay'` configs ignore `repeat`.

## `onAnimationEnd`

Sequence and repeat lifecycle is reported through one callback:

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

Transform parents fire once per logical event, not once per axis. A `translateX` + `translateY` animation on the same primitive produces the callback shape you'd expect from "translate", not two duplicates — when the terminal `'animation'` phase fires for any transform key, `key` is reported as the sentinel `'transform'`. Mid-step events (`'step'` / `'sequence'` / `'repeat'`) still fire per-axis with the specific axis name (`'translateX'`, `'scale'`, etc.) since each step is its own logical event.

An endless axis is not part of that group. A property with `repeat: 'infinite'` never reaches `'animation'` — it emits `'repeat'` forever — so it is excluded from the transform group rather than holding it open. Give `translateX` an infinite repeat and `translateY` a finite one and you still get the terminal `'transform'` callback when `translateY` lands; make _every_ transform axis infinite and no terminal callback fires at all, which is the honest answer since nothing ever finishes.

The same rule protects [`<Presence>`](./presence): an endless `exit` animation can never settle, so it does not gate the unmount. If every exiting property repeats forever the child is removed immediately; if some are finite, those still gate it. Note that a top-level `transition={{ repeat: 'infinite' }}` is inherited by `exit` — scope the repeat to the property you actually want looping (`transition={{ opacity: { repeat: 'infinite' } }}`) if you also want a normal exit.
