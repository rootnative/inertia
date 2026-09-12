/**
 * Compile-time gate for `useMotionValue`'s overload set.
 *
 * Two things are pinned here, and they pull against each other.
 *
 * **Literal widening.** Inferring a bare literal against a type parameter
 * skips widening, so without the primitive overloads `useMotionValue(0)`
 * would come back as `SharedValue<0>` and reject every subsequent write —
 * including the hook's own docstring example, `x.value = 100`.
 *
 * **Structured values.** The generic overload is deliberately
 * *unconstrained*. It used to read `T extends number | string`, which
 * contradicted the documented promise of a pass-through over
 * `useSharedValue` and sent consumers to a direct `react-native-reanimated`
 * import for the one value the library could not hold. The array and record
 * cases below are what stop that constraint coming back: reinstating it
 * fails this file rather than a consumer's app.
 *
 * These assertions run under `tsc --noEmit` (the typecheck CI step); the file
 * is excluded from the tsup build via the explicit entry list and from Jest
 * via the `__tests__`-only testMatch glob.
 */

import type { SharedValue } from 'react-native-reanimated'
import { useMotionValue } from '../values'

declare function expectType<T>(value: T): void

// Hook calls live inside a component so rules-of-hooks lint holds; the
// function is never rendered — only type-checked.
export function MotionValueTypeProbe() {
  const x = useMotionValue(0)
  expectType<SharedValue<number>>(x)
  // The load-bearing check: a bare-literal initial value must widen so
  // subsequent writes type-check.
  x.value = 100

  const color = useMotionValue('#fff')
  expectType<SharedValue<string>>(color)
  color.value = '#000'

  // The explicit-generic escape hatch still narrows, e.g. for string unions.
  const state = useMotionValue<'open' | 'closed'>('open')
  expectType<SharedValue<'open' | 'closed'>>(state)
  // @ts-expect-error writes outside the explicit union must be rejected
  state.value = 'ajar'

  // A structured value: one measurement per item, read from a worklet by
  // index. This is the shape that forced a direct Reanimated import while the
  // generic was constrained.
  const cellTops = useMotionValue<number[]>([])
  expectType<SharedValue<number[]>>(cellTops)
  cellTops.value = [0, 12, 24]

  // Inferred rather than annotated, so the constraint cannot be reintroduced
  // and satisfied by the explicit type argument alone.
  const boxes = useMotionValue({ header: 0, footer: 0 })
  expectType<SharedValue<{ header: number; footer: number }>>(boxes)
  boxes.value = { header: 8, footer: 96 }

  const ready = useMotionValue(false)
  expectType<SharedValue<boolean>>(ready)
  ready.value = true

  return null
}
