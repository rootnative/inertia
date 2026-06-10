import { StyleSheet, Text } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

export function GestureScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell
      title="Gesture"
      description="The gesture prop on every Motion.* primitive. Press to scale down (card) or pulse up (pill) — no separate Pressable variant."
      onBack={onBack}
    >
      <Text style={styles.caption}>Press and hold</Text>
      <Motion.View
        gesture={{
          pressed: { scaleX: 0.94, scaleY: 0.94, opacity: 0.85 },
        }}
        transition={{
          scaleX: { type: 'spring', tension: 220, friction: 18 },
          scaleY: { type: 'spring', tension: 220, friction: 18 },
          opacity: { type: 'timing', duration: 120 },
        }}
        style={styles.card}
      />
      <Text style={styles.caption}>Press to pulse</Text>
      <Motion.View
        gesture={{
          pressed: { scaleX: 1.08, scaleY: 1.08, translateY: -4 },
        }}
        transition={{ type: 'spring', tension: 260, friction: 14 }}
        style={styles.pill}
      />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    width: 160,
    height: 160,
    backgroundColor: '#4f46e5',
    borderRadius: 24,
  },
  pill: {
    width: 200,
    height: 56,
    backgroundColor: '#10b981',
    borderRadius: 28,
  },
})
