import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

export function TextScreen({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(false)
  return (
    <ScreenShell title="Motion.Text" onBack={onBack}>
      <Pressable onPress={() => setOn((o) => !o)} style={styles.button}>
        <Text style={styles.buttonLabel}>Toggle</Text>
      </Pressable>
      <Motion.Text
        initial={{ opacity: 0, translateX: -60 }}
        animate={{ opacity: on ? 1 : 0.4, translateX: on ? 0 : -20 }}
        transition={{ type: 'spring' }}
        style={styles.label}
      >
        Animated text
      </Motion.Text>
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
  label: {
    fontSize: 28,
    fontWeight: '700',
  },
})
