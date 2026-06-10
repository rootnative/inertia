import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion, Presence } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

export function PresenceScreen({ onBack }: { onBack: () => void }) {
  const [show, setShow] = useState(true)
  const [count, setCount] = useState(0)
  return (
    <ScreenShell
      title="Presence"
      description="Exiting children get pointerEvents='none' automatically — taps fall through to whatever's underneath, fixing the moti #297 double-click repro."
      onBack={onBack}
    >
      <Pressable onPress={() => setShow((s) => !s)} style={styles.toggle}>
        <Text style={styles.toggleLabel}>{show ? 'Hide' : 'Show'}</Text>
      </Pressable>
      <Text style={styles.caption}>Background taps: {count}</Text>
      <View style={styles.stack}>
        <Pressable
          onPress={() => setCount((n) => n + 1)}
          style={styles.background}
        >
          <Text style={styles.backgroundLabel}>Tap background</Text>
        </Pressable>
        <Presence>
          {show ? (
            <Motion.View
              key="card"
              initial={{ opacity: 0, translateY: 24 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 24 }}
              transition={{
                opacity: { type: 'timing', duration: 220 },
                translateY: { type: 'spring', tension: 200, friction: 18 },
              }}
              style={styles.card}
            />
          ) : null}
        </Presence>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  toggleLabel: {
    color: 'white',
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    color: '#6b7280',
  },
  stack: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
  },
  backgroundLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  card: {
    width: 160,
    height: 160,
    backgroundColor: '#10b981',
    borderRadius: 20,
  },
})
