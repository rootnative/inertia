import { memo, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { ScreenShell } from './ScreenShell'

// Phase-3 acceptance harness for the moti #322 / #336 bar:
//
//   "A virtualized-list row using `Motion.Pressable` with a `gesture` prop
//    matches a hand-rolled `Pressable + useAnimatedStyle` row within 5% on
//    Android dropped-frames."
//
// Two row implementations sit behind a toggle so the same scroll motion can
// be repeated against each. See docs/docs/perf-bench.md for the manual
// run procedure (PerfMonitor + JS profiler readout, dropped-frame count).
//
// LIST BACKEND — read before recording numbers.
//
// The acceptance bar is specifically about FlashList, because moti #322 is a
// FlashList recycling bug: a recycled row reuses a mounted component instance
// with new props, which is the case a declarative animation layer can get
// wrong. FlatList unmounts and remounts instead, so it does not exercise that
// path and a green FlatList run does NOT close the bar.
//
// FlatList is the default only so the screen is usable in Expo Go —
// FlashList's native `AutoLayoutView` is not bundled there. To run the
// canonical reproduction:
//
//   1. pnpm --filter @rootnative/inertia-example add @shopify/flash-list
//   2. npx expo run:android   (a dev client; Expo Go will not work)
//   3. flip USE_FLASH_LIST below
//
// Record the result in CLAUDE.md's device-validation table either way, and
// say which backend produced it.

// Flip to true after installing @shopify/flash-list and building a dev
// client (see the note above). Left as a flag rather than a bare import so
// the swap is one edit and the screen still compiles in Expo Go.
const USE_FLASH_LIST = false

type Mode = 'inertia' | 'hand-rolled'

const ITEM_COUNT = 1000
const ROW_HEIGHT = 96

interface Item {
  id: number
  label: string
  color: string
}

// Stable palette derived from index — colors don't change between renders so
// the only frame work comes from list rendering and gesture animations,
// not color recomputation.
const PALETTE = [
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#14b8a6',
] as const

function buildItems(): Item[] {
  return Array.from({ length: ITEM_COUNT }, (_, i) => ({
    id: i,
    label: `Row ${i.toString().padStart(4, '0')}`,
    color: PALETTE[i % PALETTE.length]!,
  }))
}

// Both rows animate the same physics. Inertia's public `tension` / `friction`
// map to Reanimated's `stiffness` / `damping` identically — the conversion in
// `transitions/spring.ts` is a rename, not a formula — so these two configs
// describe one spring. Keep them in step; if they drift, the benchmark stops
// measuring the library and starts measuring the config.
const PRESS_SCALE = 0.96
const SPRING_TENSION = 320
const SPRING_FRICTION = 22

const INERTIA_TRANSITION = {
  type: 'spring',
  tension: SPRING_TENSION,
  friction: SPRING_FRICTION,
} as const
const INERTIA_GESTURE = { pressed: { scale: PRESS_SCALE } } as const

const HAND_ROLLED_SPRING = {
  stiffness: SPRING_TENSION,
  damping: SPRING_FRICTION,
  mass: 1,
} as const

// VIEW PARITY IS LOAD-BEARING. Both variants must render exactly one host
// view per row. `Motion.Pressable` is a single animated pressable, so the
// hand-rolled side uses `Animated.createAnimatedComponent(Pressable)` rather
// than the more obvious `<Pressable><Animated.View/></Pressable>` — that
// nesting costs one extra view per row, and across 1000 rows it makes the
// comparison measure view count instead of animation overhead.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const InertiaRow = memo(function InertiaRow({ item }: { item: Item }) {
  const rowStyle = useMemo(
    () => [styles.row, { backgroundColor: item.color }],
    [item.color],
  )
  return (
    <Motion.Pressable
      gesture={INERTIA_GESTURE}
      transition={INERTIA_TRANSITION}
      style={rowStyle}
    >
      <Text style={styles.rowLabel}>{item.label}</Text>
    </Motion.Pressable>
  )
})

const HandRolledRow = memo(function HandRolledRow({ item }: { item: Item }) {
  const pressed = useSharedValue(0)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(
          1 - pressed.value * (1 - PRESS_SCALE),
          HAND_ROLLED_SPRING,
        ),
      },
    ],
  }))
  const rowStyle = useMemo(
    () => [styles.row, { backgroundColor: item.color }, animatedStyle],
    [item.color, animatedStyle],
  )
  const onPressIn = () => {
    pressed.value = 1
  }
  const onPressOut = () => {
    pressed.value = 0
  }
  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={rowStyle}
    >
      <Text style={styles.rowLabel}>{item.label}</Text>
    </AnimatedPressable>
  )
})

export function PerfBenchScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('inertia')
  const items = useMemo(buildItems, [])
  const renderItem = useMemo(
    () =>
      mode === 'inertia'
        ? ({ item }: { item: Item }) => <InertiaRow item={item} />
        : ({ item }: { item: Item }) => <HandRolledRow item={item} />,
    [mode],
  )
  const keyExtractor = (item: Item) => String(item.id)

  return (
    <ScreenShell
      title="Perf bench"
      description="Toggle between Motion.Pressable and a hand-rolled Pressable + useAnimatedStyle row, then scroll vigorously. Watch PerfMonitor for dropped frames."
      onBack={onBack}
      fill
    >
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setMode('inertia')}
          style={[
            styles.toggleButton,
            mode === 'inertia' && styles.toggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.toggleLabel,
              mode === 'inertia' && styles.toggleLabelActive,
            ]}
          >
            Inertia
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('hand-rolled')}
          style={[
            styles.toggleButton,
            mode === 'hand-rolled' && styles.toggleButtonActive,
          ]}
        >
          <Text
            style={[
              styles.toggleLabel,
              mode === 'hand-rolled' && styles.toggleLabelActive,
            ]}
          >
            Hand-rolled
          </Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>
        {ITEM_COUNT} rows · {USE_FLASH_LIST ? 'FlashList' : 'FlatList'}
        {USE_FLASH_LIST ? '' : ' (does not close the moti #322 bar)'}
      </Text>
      <View style={styles.listContainer}>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({
            length: ROW_HEIGHT + 12,
            offset: (ROW_HEIGHT + 12) * index,
            index,
          })}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews
        />
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  toggleButtonActive: {
    backgroundColor: '#4f46e5',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  toggleLabelActive: {
    color: '#fff',
  },
  caption: {
    fontSize: 13,
    color: '#6b7280',
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  row: {
    height: ROW_HEIGHT,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  rowLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
})
