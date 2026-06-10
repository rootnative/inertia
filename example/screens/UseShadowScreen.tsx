import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion, useShadow, useSpring } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * `useShadow` is the value-layer escape hatch for shadow tweening — it maps a
 * `progress` shared value (0→1) onto an animated shadow style. Whatever drives
 * `progress` is the caller's concern: a `useSpring`, a scroll-derived
 * `useTransform`, a gesture progress value, anything.
 *
 * This screen drives it from a `useSpring` that toggles between 0 and 1, so
 * the shadow rises and falls on a smooth physics curve while the underlying
 * `Motion.View` stays still. The point is the *source* — the same hook would
 * work just as well wired to scroll position or a pan gesture.
 */
export function UseShadowScreen({ onBack }: { onBack: () => void }) {
  const [raised, setRaised] = useState(false)
  // Drive the tween from a single spring shared value. The shadow follows
  // the spring curve; the card body never re-renders.
  const progress = useSpring(raised ? 1 : 0, { tension: 180, friction: 18 })
  const shadowStyle = useShadow({
    from: REST_SHADOW,
    to: RAISED_SHADOW,
    progress,
  })

  return (
    <ScreenShell
      title="useShadow"
      description="Drive shadow interpolation from any progress source. Here a useSpring toggles 0↔1; the shadow follows the spring curve while the card itself stays put."
      onBack={onBack}
    >
      <Motion.View style={[styles.card, shadowStyle]}>
        <Text style={styles.cardTitle}>Card</Text>
        <Text style={styles.cardBody}>
          Shadow style is produced by `useShadow({'{ from, to, progress }'})`
          and spread onto `style`. The card has no `animate`, no `gesture`.
        </Text>
      </Motion.View>

      <Pressable
        onPress={() => setRaised((r) => !r)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonLabel}>
          {raised ? 'Lower the card' : 'Raise the card'}
        </Text>
      </Pressable>
    </ScreenShell>
  )
}

const REST_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
}

const RAISED_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.24,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    gap: 10,
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
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  buttonPressed: {
    backgroundColor: '#4338ca',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
})
