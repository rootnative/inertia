import { memo, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@onlynative/inertia'
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
// Uses `FlatList` so the harness runs in Expo Go without a custom dev
// client. For the canonical moti #322 reproduction, swap `FlatList` →
// `FlashList` (one import + tag change); FlashList needs a dev client
// because its native `AutoLayoutView` isn't bundled with Expo Go.

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

// SPRING is shared between both row variants so the gesture animation is
// physically identical — the only delta is which library drives the
// pressed-state shared value.
const SPRING = { stiffness: 320, damping: 22, mass: 1 } as const

const InertiaRow = memo(function InertiaRow({ item }: { item: Item }) {
  const rowStyle = useMemo(
    () => [styles.row, { backgroundColor: item.color }],
    [item.color],
  )
  return (
    <Motion.Pressable
      gesture={{ pressed: { scale: 0.96 } }}
      transition={{ type: 'spring', tension: 320, friction: 22 }}
      style={rowStyle}
    >
      <Text style={styles.rowLabel}>{item.label}</Text>
    </Motion.Pressable>
  )
})

const HandRolledRow = memo(function HandRolledRow({ item }: { item: Item }) {
  const pressed = useSharedValue(0)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 - pressed.value * 0.04, SPRING) }],
  }))
  const rowStyle = useMemo(
    () => [styles.row, { backgroundColor: item.color }],
    [item.color],
  )
  return (
    <Pressable
      onPressIn={() => {
        pressed.value = 1
      }}
      onPressOut={() => {
        pressed.value = 0
      }}
    >
      <Animated.View style={[rowStyle, animatedStyle]}>
        <Text style={styles.rowLabel}>{item.label}</Text>
      </Animated.View>
    </Pressable>
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
    <ScreenShell title="Perf bench" onBack={onBack}>
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
        Scroll vigorously and watch PerfMonitor. {ITEM_COUNT} rows.
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
