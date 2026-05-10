import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

const IMAGE = { uri: 'https://reactnative.dev/img/tiny_logo.png' }

export function ImageScreen({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(false)
  return (
    <ScreenShell
      title="Motion.Image"
      description="ImageStyle-typed primitive — tintColor and transforms compile, ViewStyle-only props don't."
      onBack={onBack}
    >
      <Pressable onPress={() => setOn((o) => !o)} style={styles.button}>
        <Text style={styles.buttonLabel}>Toggle</Text>
      </Pressable>
      <Motion.Image
        source={IMAGE}
        initial={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: on ? -20 : 0 }}
        transition={{ type: 'spring' }}
        style={styles.image}
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
  image: {
    width: 96,
    height: 96,
  },
})
