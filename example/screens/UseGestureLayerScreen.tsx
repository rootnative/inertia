import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useGestureLayer } from '@rootnative/inertia/gesture-layer'
import { ScreenShell } from './ScreenShell'

/**
 * `useGestureLayer` (from `@rootnative/inertia/gesture-layer`) is the
 * "strongest active layer wins" state-layer primitive one step above
 * `useGesture()`. Supply per-state target values; the hook owns the four
 * gesture progress shared values, the disabled override, the worklet, and
 * the transition.
 *
 * Numeric keys compose via clamped-max (the MD3 halo model — overlapping
 * states raise the value to the strongest, never the sum); color keys
 * cascade `hovered → focused → focusVisible → pressed` via
 * `interpolateColor`. The `disabled` layer sits above everything and is
 * gated by a JS flag rather than a gesture.
 */
export function UseGestureLayerScreen({ onBack }: { onBack: () => void }) {
  const [disabled, setDisabled] = useState(false)

  const { style, handlers } = useGestureLayer(
    {
      rest: { opacity: 0, backgroundColor: 'transparent' },
      hovered: { opacity: 0.08, backgroundColor: '#4f46e5' },
      focused: { opacity: 0.1, backgroundColor: '#4f46e5' },
      pressed: { opacity: 0.14, backgroundColor: '#4f46e5' },
      disabled: { opacity: 0.06, backgroundColor: '#6b7280' },
    },
    { disabled, transition: { type: 'timing', duration: 150 } },
  )

  return (
    <ScreenShell
      title="useGestureLayer"
      description="MD3-style state-layer halo: press (and hover/focus on web) fades an overlay in via clamped-max composition. Toggle disabled to see the JS-gated top layer override every gesture."
      onBack={onBack}
    >
      <Pressable
        {...handlers}
        disabled={disabled}
        style={styles.card}
        accessibilityRole="button"
      >
        <Animated.View pointerEvents="none" style={[styles.halo, style]} />
        <Text style={styles.cardTitle}>State-layer card</Text>
        <Text style={styles.cardBody}>
          The halo is an absolutely-filled Animated.View whose opacity and color
          come entirely from useGestureLayer. The card itself never re-renders
          while you interact.
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setDisabled((d) => !d)}
        style={({ pressed }) => [
          styles.toggle,
          pressed && styles.togglePressed,
        ]}
      >
        <Text style={styles.toggleLabel}>
          {disabled ? 'Enable' : 'Disable'} the card
        </Text>
      </Pressable>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          Need additive or multiplied blends instead of clamped-max? Drop down
          to useGesture() and write the composition worklet yourself — this hook
          covers the state-layer pattern only.
        </Text>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
    overflow: 'hidden',
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6b7280',
  },
  toggle: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#1f2937',
    borderRadius: 10,
  },
  togglePressed: {
    backgroundColor: '#111827',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  note: {
    maxWidth: 320,
    padding: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6b7280',
  },
})
