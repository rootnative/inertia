import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

const ICON = { uri: 'https://reactnative.dev/img/tiny_logo.png' }

export function ColorScreen({ onBack }: { onBack: () => void }) {
  const [toggled, setToggled] = useState(false)
  const [active, setActive] = useState(false)

  return (
    <ScreenShell title="Color" onBack={onBack}>
      <Text style={styles.caption}>State-layer Pressable</Text>
      <Motion.Pressable
        gesture={{
          hovered: { backgroundColor: '#4338ca' },
          focused: { backgroundColor: '#4338ca' },
          pressed: { backgroundColor: '#3730a3' },
        }}
        transition={{ type: 'timing', duration: 150 }}
        style={styles.stateLayer}
      >
        <Text style={styles.stateLayerLabel}>Press / hover / focus me</Text>
      </Motion.Pressable>

      <Text style={styles.caption}>Toggle background + border</Text>
      <Pressable onPress={() => setToggled((t) => !t)} style={styles.trigger}>
        <Text style={styles.triggerLabel}>Toggle</Text>
      </Pressable>
      <Motion.View
        animate={{
          backgroundColor: toggled ? '#10b981' : '#f3f4f6',
          borderColor: toggled ? '#065f46' : '#9ca3af',
        }}
        transition={{ type: 'timing', duration: 220 }}
        style={styles.swatch}
      />

      <Text style={styles.caption}>Animated text color</Text>
      <Motion.Text
        animate={{ color: toggled ? '#dc2626' : '#1f2937' }}
        transition={{ type: 'timing', duration: 220 }}
        style={styles.headline}
      >
        Inertia
      </Motion.Text>

      <Text style={styles.caption}>Motion.Image tintColor</Text>
      <Pressable onPress={() => setActive((a) => !a)} style={styles.trigger}>
        <Text style={styles.triggerLabel}>Toggle tint</Text>
      </Pressable>
      <Motion.Image
        source={ICON}
        initial={{ tintColor: '#9ca3af' }}
        animate={{ tintColor: active ? '#0a84ff' : '#9ca3af' }}
        transition={{ type: 'timing', duration: 200 }}
        style={styles.icon}
      />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stateLayer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  stateLayerLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  trigger: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  triggerLabel: {
    color: 'white',
    fontWeight: '600',
  },
  swatch: {
    width: 160,
    height: 80,
    borderRadius: 16,
    borderWidth: 3,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  icon: {
    width: 80,
    height: 80,
  },
})
