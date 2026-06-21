/**
 * Compile-time gate for `useMotionValue` literal widening.
 *
 * The hook's generic is constrained to `number | string`, and TS skips
 * literal widening when inferring against a constrained type parameter —
 * without the primitive overloads, `useMotionValue(0)` would infer
 * `SharedValue<0>` and reject every subsequent write (including the hook's
 * own docstring example, `x.value = 100`). These assertions run under
 * `tsc --noEmit` (the typecheck CI step); the file is excluded from the tsup
 * build via the explicit entry list and from Jest via the `__tests__`-only
 * testMatch glob.
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

  return null
}
