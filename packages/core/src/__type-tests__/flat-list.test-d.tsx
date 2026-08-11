/**
 * `Motion.FlatList` type surface.
 *
 * This file exists because the primitive's typing is the fragile part of its
 * design, and none of it is observable at runtime.
 *
 * `createMotionComponent<C>` returns a non-generic `MotionComponent<C>`, so
 * wrapping `FlatList` the ordinary way collapses `data` and `renderItem` to
 * `any` — the list still works, and every row callback silently loses its item
 * type. Reanimated hit the identical wall (see the `@ts-expect-error` above its
 * `AnimatedFlatList`, and the manual call-signature cast on its
 * `ReanimatedFlatList` export). `MotionFlatList` applies the same fix: a
 * generic on the *call signature*, so `ItemT` infers per JSX call site.
 *
 * A regression here is invisible — `any` typechecks everywhere — so these
 * assertions are the only thing holding item inference in place.
 */
import { Text } from 'react-native'
import { Motion } from '../motion'

type Row = { id: string; label: string }

const DATA: Row[] = [{ id: 'a', label: 'Alpha' }]

// `renderItem`'s `item` infers as `Row` from `data`, not `any`. The property
// access is the assertion: `item.label` compiles, and a non-existent key does
// not (checked below).
export const inferred = (
  <Motion.FlatList
    data={DATA}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <Text>{item.label}</Text>}
  />
)

// A key that isn't on `Row` must error — this is what proves `item` is not
// `any`. Without the generic call signature this line compiles happily.
export const rejectsUnknownItemKey = (
  <Motion.FlatList
    data={DATA}
    // @ts-expect-error `nope` does not exist on `Row`
    renderItem={({ item }) => <Text>{item.nope}</Text>}
  />
)

// Animation props coexist with list props on one component. This is the whole
// reason the primitive exists.
export const animated = (
  <Motion.FlatList
    data={DATA}
    renderItem={({ item }) => <Text>{item.label}</Text>}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: 'spring', tension: 180, friction: 12 }}
  />
)

// `animate` is narrowed to animatable keys, exactly as on every other
// primitive — a FlatList's `style` is its scroll container's `ViewStyle`.
export const rejectsNonAnimatableKey = (
  <Motion.FlatList
    data={DATA}
    renderItem={({ item }) => <Text>{item.label}</Text>}
    // @ts-expect-error `position` is not animatable (nothing to interpolate)
    animate={{ position: 'absolute' }}
  />
)

// Gesture sub-states and variants work here too — the factory's whole surface
// is available, not a subset.
export const withVariants = (
  <Motion.FlatList
    data={DATA}
    renderItem={({ item }) => <Text>{item.label}</Text>}
    variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
    animate="shown"
  />
)

export const rejectsUnknownVariant = (
  <Motion.FlatList
    data={DATA}
    renderItem={({ item }) => <Text>{item.label}</Text>}
    variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
    // @ts-expect-error 'visible' is not a declared variant key
    animate="visible"
  />
)
