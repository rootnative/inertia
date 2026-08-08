import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * The layout numerics added in `0.0.5` — padding, margin, insets, per-corner
 * radii, border widths, flex, gap, and the `Motion.Text` metrics. Every one of
 * these typechecked and was silently dropped before that release, so this
 * screen exists mostly to prove on hardware that they now actually move.
 *
 * What to watch for on a device, none of which a test can see:
 *
 *  1. **Reflow cost.** Each of these drives real layout, unlike `scale` /
 *     `translate*`, which composite. Both cards in the first row shrink an
 *     identical 90pt bar to an identical 26pt — one by `paddingHorizontal` on
 *     the parent, one by `scaleX` on the bar — so the frame cost is directly
 *     comparable. On a low-end Android device the padding card is the one that
 *     will drop frames first. Keep the two end states equal if you edit this:
 *     the pairing is worthless the moment the bars land on different widths.
 *  2. **Per-corner radii springing independently.** Each corner has its own
 *     shared value, so an under-damped spring can overshoot them out of sync.
 *     That looks wrong on a card and is the reason to keep radius springs
 *     tighter than transform springs.
 *  3. **Absolute insets vs. translate.** The drawer animates `left`; a
 *     translate-driven drawer sits beside it. They should land in the same
 *     place — if they don't, the inset path is fighting a parent's layout.
 *  4. **`flex` interpolation between siblings.** Two panes split a row by
 *     animating `flex`. This is the case that has no transform equivalent,
 *     which is why it's worth the reflow.
 *  5. **Text metrics re-measuring.** `fontSize` reflows the text run every
 *     frame; `scale` on the same string does not. Compare the two labels — the
 *     scaled one is smoother, the `fontSize` one is correct when surrounding
 *     content must move out of the way.
 */
export function LayoutKeysScreen({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(false)

  return (
    <ScreenShell
      title="Layout keys"
      description="Padding, margin, insets, per-corner radii, border widths, flex, gap, and text metrics — the layout numerics added in 0.0.5. Tap to toggle."
      onBack={onBack}
    >
      <View style={styles.stage}>
        <Pressable onPress={() => setOn((v) => !v)} style={styles.toggle}>
          <Text style={styles.toggleLabel}>{on ? 'Reset' : 'Animate'}</Text>
        </Pressable>

        <Text style={styles.label}>Reflow vs. composite · same end state</Text>
        <View style={styles.row}>
          <Motion.View
            style={styles.padCard}
            animate={{ paddingHorizontal: on ? 44 : 12 }}
            transition={SPRING}
          >
            <View style={styles.inner} />
          </Motion.View>
          <View style={styles.padCard}>
            <Motion.View
              style={styles.inner}
              animate={{ scaleX: on ? INNER_SCALE : 1 }}
              transition={SPRING}
            />
          </View>
        </View>
        <Text style={styles.note}>
          Both bars shrink from 90pt to 26pt. The left card reflows — the parent
          re-lays-out its child every frame; the right composites — the bar is
          scaled on the GPU and the layout never changes. Watch which one
          stutters first under load, and note the right bar's rounded corners
          squash horizontally while the left bar's stay circular.
        </Text>

        <Text style={styles.label}>Per-corner radius · squares off</Text>
        <Motion.View
          style={styles.card}
          animate={{
            borderTopLeftRadius: on ? 32 : 8,
            borderTopRightRadius: on ? 32 : 8,
            borderBottomLeftRadius: on ? 0 : 8,
            borderBottomRightRadius: on ? 0 : 8,
          }}
          transition={SPRING}
        />

        <Text style={styles.label}>Border width · underline affordance</Text>
        <Motion.View
          style={styles.field}
          animate={{ borderBottomWidth: on ? 3 : 1 }}
          transition={{ type: 'timing', duration: 160 }}
        />

        <Text style={styles.label}>Absolute inset vs. translate</Text>
        <View style={styles.insetStage}>
          <Motion.View
            style={styles.drawer}
            animate={{ left: on ? 120 : 8 }}
            transition={SPRING}
          />
          <Motion.View
            style={styles.drawerAlt}
            animate={{ translateX: on ? 112 : 0 }}
            transition={SPRING}
          />
        </View>
        <Text style={styles.note}>
          Top animates `left`, bottom animates `translateX` by the same
          distance. They should stay aligned throughout, not just at the ends.
        </Text>

        <Text style={styles.label}>Flex split · no transform equivalent</Text>
        <View style={styles.paneRow}>
          <Motion.View
            style={styles.paneA}
            animate={{ flex: on ? 3 : 1 }}
            transition={SPRING}
          />
          <Motion.View
            style={styles.paneB}
            animate={{ flex: on ? 1 : 3 }}
            transition={SPRING}
          />
        </View>

        <Text style={styles.label}>Gap · list density</Text>
        <Motion.View
          style={styles.gapRow}
          animate={{ gap: on ? 20 : 4 }}
          transition={SPRING}
        >
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Motion.View>

        <Text style={styles.label}>Text metrics · fontSize vs. scale</Text>
        <Motion.Text
          style={styles.metricText}
          animate={{ fontSize: on ? 28 : 16 }}
          transition={SPRING}
        >
          fontSize reflows
        </Motion.Text>
        <Motion.Text
          style={styles.metricText}
          animate={{ scale: on ? 28 / 16 : 1 }}
          transition={SPRING}
        >
          scale composites
        </Motion.Text>
        <Text style={styles.note}>
          The first re-measures the text run every frame and pushes siblings
          down; the second is smoother but overlaps rather than reflowing. Pick
          per whether surrounding content must move.
        </Text>
      </View>
    </ScreenShell>
  )
}

// Kept tight on purpose: an under-damped spring desynchronizes the four corner
// radii visibly, which is the wrong look for a card even though each corner is
// individually correct.
const SPRING = { type: 'spring' as const, tension: 180, friction: 20 }

// `padCard` is 114 wide with 12pt of horizontal padding, so the inner bar is
// 90pt at rest and 26pt once padding animates to 44. The composite card scales
// its bar by the same ratio so both land on the same width — otherwise the
// pairing compares two different animations and proves nothing about reflow.
const INNER_SCALE = 26 / 90

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 14,
  },
  toggle: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  // Fixed width is load-bearing. Without it the card is content-sized around
  // `inner`, so the padding card ends at 24 + 2*44 = 112pt while the scaleX
  // card ends at 24 * 1.5 = 36 — the two stop being comparable, which is the
  // entire point of the pairing.
  padCard: {
    width: 114,
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inner: {
    flex: 1,
    backgroundColor: '#c7d2fe',
    borderRadius: 6,
  },
  card: {
    width: 240,
    height: 72,
    backgroundColor: '#ffffff',
  },
  field: {
    width: 240,
    height: 44,
    backgroundColor: '#ffffff',
    borderBottomColor: '#4f46e5',
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  insetStage: {
    width: 240,
    height: 68,
    gap: 8,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 8,
    width: 100,
    height: 28,
    backgroundColor: '#4f46e5',
    borderRadius: 6,
  },
  drawerAlt: {
    position: 'absolute',
    top: 36,
    left: 8,
    width: 100,
    height: 28,
    backgroundColor: '#a5b4fc',
    borderRadius: 6,
  },
  paneRow: {
    flexDirection: 'row',
    width: 240,
    height: 48,
    gap: 6,
  },
  // Static `flex` matches each pane's resting `animate` value. Without it both
  // panes are zero-width until the first tap and the row renders empty on first
  // paint, which reads as a broken demo rather than an un-animated one.
  paneA: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  paneB: {
    flex: 3,
    backgroundColor: '#c7d2fe',
    borderRadius: 8,
  },
  gapRow: {
    flexDirection: 'row',
    width: 240,
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  // Explicit base size matters: without it this text renders at RN's default
  // (14) while its `fontSize` partner starts at 16, so the two labels would
  // start and end at different sizes and the comparison would be invalid.
  metricText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    paddingHorizontal: 8,
  },
})
