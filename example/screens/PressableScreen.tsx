import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

export function PressableScreen({ onBack }: { onBack: () => void }) {
  const [count, setCount] = useState(0)
  return (
    <ScreenShell
      title="Motion.Pressable"
      description="Pressable that animates its press feedback through the gesture prop while still firing onPress."
      onBack={onBack}
    >
      <Text style={styles.caption}>Tapped {count} times</Text>
      <Motion.Pressable
        onPress={() => setCount((n) => n + 1)}
        gesture={{
          pressed: { scaleX: 0.95, scaleY: 0.95, opacity: 0.8 },
        }}
        transition={{ type: 'spring', tension: 240, friction: 16 }}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Tap me</Text>
      </Motion.Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 14,
    color: '#6b7280',
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
  },
  buttonLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
