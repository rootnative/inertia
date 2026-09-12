import { useRef } from 'react'
import { StyleSheet, Text, type View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Motion, useInView, useInterpolatedStyle } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const CARDS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * `useInView` turns "the user can see this" into a 0↔1 shared value, which is
 * the shape every interpolator in the value layer already takes. Each card
 * below holds a ref, and its entrance runs when it arrives rather than when
 * the screen mounts.
 *
 * What to look for on a device, because none of it is observable in Jest:
 *
 * 1. **Cards below the fold are still faded on first paint.** Before this hook
 *    they finished their entrance off-screen and the visitor scrolled into
 *    static content.
 * 2. **The animation fires as each card crosses the edge**, not in one batch.
 * 3. **The last card uses `once: false`**, so it fades back out when it leaves.
 *    Every other card holds its entrance, which is the default.
 * 4. **Scrolling fast must not drop frames** — the detection runs on the UI
 *    thread off one measurement, so there is no per-frame JS work to see.
 */
function Card({ index }: { index: number }) {
  const ref = useRef<View>(null)
  // The last card tracks visibility both ways so the exit is visible too.
  const once = index !== CARDS.length
  const inView = useInView(ref, { amount: 0.4, once, margin: -40 })

  const style = useInterpolatedStyle(inView, {
    opacity: [0, 1],
    translateY: [32, 0],
    scale: [0.94, 1],
  })

  return (
    <Motion.View ref={ref} style={[styles.card, style]}>
      <Text style={styles.cardIndex}>{index}</Text>
      <Text style={styles.cardLabel}>
        {once ? 'once: true (default)' : 'once: false — fades back out'}
      </Text>
    </Motion.View>
  )
}

export function UseInViewScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell
      title="useInView"
      description="Each card animates when it scrolls into the container, not when the screen mounts. amount: 0.4 waits for 40% of the card; margin: -40 shrinks the detection box so the card is well inside before it fires."
      onBack={onBack}
      fill
    >
      <Motion.ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
      >
        <Animated.View style={styles.spacer}>
          <Text style={styles.spacerLabel}>Scroll down</Text>
        </Animated.View>
        {CARDS.map((index) => (
          <Card key={index} index={index} />
        ))}
      </Motion.ScrollView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
    paddingHorizontal: 16,
  },
  spacer: {
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    justifyContent: 'center',
    height: 220,
    marginBottom: 16,
  },
  spacerLabel: {
    color: '#4338ca',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#4f46e5',
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
  },
  cardIndex: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  cardLabel: {
    color: '#c7d2fe',
    fontSize: 13,
    marginTop: 4,
  },
})
