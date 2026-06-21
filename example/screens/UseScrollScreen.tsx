import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { Motion, useScroll, useTransform } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const ROWS = Array.from({ length: 30 }, (_, i) => i + 1)

/**
 * `useScroll` tracks a `Motion.ScrollView`'s offset as shared values on the
 * UI thread — no JS bounce per frame. `useTransform` then maps that offset
 * onto whatever the header needs: both overloads are shown here, the
 * numeric interpolation (`[0, 140] → [1, 0]`) and the color interpolation
 * (`[0, 140] → ['#ffffff', '#4f46e5']`).
 *
 * Everything below the hook calls is plain Reanimated interop: the derived
 * shared values are read inside `useAnimatedStyle` and spread on the header.
 */
export function UseScrollScreen({ onBack }: { onBack: () => void }) {
  const { scrollY, onScroll } = useScroll()

  // Numeric overload — hero copy fades and lifts as the list scrolls.
  const heroOpacity = useTransform(scrollY, [0, 140], [1, 0])
  const heroShift = useTransform(scrollY, [0, 140], [0, -16])
  // Color overload — the compact bar tints in over the same range.
  const barColor = useTransform(scrollY, [0, 140], ['#ffffff', '#4f46e5'])
  const barTextColor = useTransform(scrollY, [0, 140], ['#111827', '#ffffff'])

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroShift.value }],
  }))
  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: barColor.value,
  }))
  const barLabelStyle = useAnimatedStyle(() => ({
    color: barTextColor.value,
  }))

  return (
    <ScreenShell
      title="useScroll + useTransform"
      description="Scroll offset tracked on the UI thread, interpolated onto opacity, translateY, and two colors. Scroll the list and watch the header collapse."
      onBack={onBack}
      fill
    >
      <View style={styles.stage}>
        <Animated.View style={[styles.bar, barStyle]}>
          <Animated.Text style={[styles.barLabel, barLabelStyle]}>
            Collapsing header
          </Animated.Text>
        </Animated.View>
        <Animated.View style={[styles.hero, heroStyle]}>
          <Text style={styles.heroTitle}>Scroll-linked values</Text>
          <Text style={styles.heroBody}>
            scrollY drives four useTransform derivations — none of them touch
            the JS thread while you scroll.
          </Text>
        </Animated.View>
        <Motion.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {ROWS.map((n) => (
            <View key={n} style={styles.row}>
              <Text style={styles.rowLabel}>Row {n}</Text>
            </View>
          ))}
        </Motion.ScrollView>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignSelf: 'stretch',
  },
  bar: {
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  barLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  heroBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 16,
    color: '#111827',
  },
})
