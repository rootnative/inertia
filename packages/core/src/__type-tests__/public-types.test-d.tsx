/**
 * Public-surface acceptance: every type that appears in an exported signature
 * must itself be importable, so a consumer can annotate the value without
 * `Parameters<>` / `ComponentProps<>` gymnastics. Runs under `tsc --noEmit`
 * like the other `*.test-d.tsx` files; a missing export is a compile error.
 */

import type { View } from 'react-native'
import type {
  CallbackFactory,
  GestureLayerTransitions,
  MotionComponentProps,
} from '../index'
import type { GestureLayerTransitions as FromSubpath } from '../gestureLayer'
import type { UseGestureLayerOptions } from '../gestureLayer'
import { resolveAnimatableValue } from '../index'

// `CallbackFactory` is the third parameter of `resolveAnimatableValue`.
const factory: CallbackFactory = (phase, step) =>
  phase === 'step' && step === 0 ? () => {} : undefined
resolveAnimatableValue(1, { type: 'timing' }, factory)

// `GestureLayerTransitions` is the per-layer shape of a gesture transition,
// reachable from the root and from the `gesture-layer` subpath.
const layers: GestureLayerTransitions = {
  pressed: { type: 'timing', duration: 120 },
  hovered: 'fast',
}
const viaSubpath: FromSubpath = layers
const options: UseGestureLayerOptions = { transition: viaSubpath }
void options

// `MotionComponentProps` types a wrapper around a primitive.
type BoxProps = MotionComponentProps<typeof View>
const boxProps: BoxProps = {
  animate: { opacity: 1 },
  transition: { type: 'spring' },
  style: { width: 10 },
}
void boxProps
