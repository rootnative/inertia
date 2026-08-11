import { useCallback } from 'react'
import { StyleSheet, Text, View, type ListRenderItemInfo } from 'react-native'
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated'
import { Motion, useScroll, useTransform } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const ROW_HEIGHT = 64
const ROW_GAP = 8
const STRIDE = ROW_HEIGHT + ROW_GAP

type Item = { id: string; index: number }

const DATA: ReadonlyArray<Item> = Array.from({ length: 400 }, (_, i) => ({
  id: String(i),
  index: i,
}))

/**
 * The combination that was impossible before `Motion.FlatList`: 400 rows,
 * virtualized, with every visible row animating off the same `useScroll`
 * offset. `Motion.ScrollView` could animate but mounted all 400; a plain
 * `FlatList` virtualized but takes no worklet `onScroll` handler.
 *
 * Note there is no `scrollEventThrottle` here: the primitive defaults it to 1,
 * so the offset updates every frame without asking.
 *
 * Rows near the top of the list have a negative `enter` bound, so at
 * `scrollY: 0` they already sit at the settled end of their own window and
 * render at rest. That is deliberate — the alternative is a first screenful
 * that starts faded out and never animates in, because nothing has scrolled
 * yet. `useTransform` clamps by default, which is what makes it hold.
 */
function Row({ item, scrollY }: { item: Item; scrollY: SharedValue<number> }) {
  // Each row's own window of scroll offset: it settles as it rises past the
  // top of the viewport and leans back out as it leaves.
  const top = item.index * STRIDE
  const enter = top - 260
  const settled = top - 90

  const opacity = useTransform(scrollY, [enter, settled], [0.3, 1])
  const shift = useTransform(scrollY, [enter, settled], [26, 0])
  const scale = useTransform(scrollY, [enter, settled], [0.92, 1])
  const tint = useTransform(scrollY, [enter, settled], ['#c7d2fe', '#4f46e5'])

  const rowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: tint.value,
    transform: [{ translateY: shift.value }, { scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.rowIndex}>
        <Text style={styles.rowIndexLabel}>{item.index}</Text>
      </View>
      <Text style={styles.rowLabel}>Virtualized row {item.index}</Text>
    </Animated.View>
  )
}

export function FlatListScreen({ onBack }: { onBack: () => void }) {
  const { scrollY, onScroll } = useScroll()

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Item>) => (
      <Row item={item} scrollY={scrollY} />
    ),
    [scrollY],
  )

  const keyExtractor = useCallback((item: Item) => item.id, [])

  return (
    <ScreenShell
      title="Motion.FlatList"
      description="400 rows, virtualized, every visible row driven by the same useScroll offset. The list frame animates its own mount on top."
      onBack={onBack}
      fill
    >
      <View style={styles.stage}>
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>
            Virtualized + scroll-driven at once
          </Text>
          <Text style={styles.bannerBody}>
            Rows fade, lift, scale, and tint from scrollY. A plain FlatList
            takes no worklet onScroll; Motion.ScrollView would mount all 400.
          </Text>
        </View>
        <Motion.FlatList
          data={DATA}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onScroll={onScroll}
          initial={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            opacity: { type: 'timing', duration: 260 },
            translateY: { type: 'spring', tension: 200, friction: 18 },
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignSelf: 'stretch',
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    gap: 4,
  },
  bannerLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  bannerBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#9ca3af',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: ROW_GAP,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  rowIndex: {
    minWidth: 34,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  rowIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
})
