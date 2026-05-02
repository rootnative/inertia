import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

export function ViewScreen({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(false)
  return (
    <ScreenShell title="Motion.View" onBack={onBack}>
      <Pressable onPress={() => setOn((o) => !o)} style={styles.button}>
        <Text style={styles.buttonLabel}>Toggle</Text>
      </Pressable>
      <Motion.View
        initial={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: on ? 1 : 0.4, translateY: on ? 0 : 40 }}
        transition={{
          opacity: { type: 'timing', duration: 200 },
          translateY: { type: 'spring', tension: 180, friction: 12 },
        }}
        style={styles.box}
      />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
  },
  box: {
    width: 120,
    height: 120,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
  },
})
