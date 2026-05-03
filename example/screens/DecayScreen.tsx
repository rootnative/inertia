import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * Tap-to-throw decay demo. Proper gesture-driven decay (drag-and-release with
 * `react-native-gesture-handler`) lands with the gesture adapter in v0.2 —
 * this screen exercises the resolver path: every press picks a new velocity,
 * the transition signature changes, and `withDecay` kicks off from the
 * current shared-value position with the new velocity, clamped to bounds.
 */
export function DecayScreen({ onBack }: { onBack: () => void }) {
  const [seed, setSeed] = useState(0)
  const [endLog, setEndLog] = useState<string>('—')

  const velocity = pseudoRandomVelocity(seed)

  return (
    <ScreenShell title="Decay" onBack={onBack}>
      <Motion.View
        animate={{ translateX: 0 }}
        transition={{
          translateX: {
            type: 'decay',
            velocity,
            deceleration: 0.998,
            clamp: [-150, 150],
          },
        }}
        onAnimationEnd={({ key, phase, finished, value }) => {
          setEndLog(
            `${String(key)} ${phase} finished=${finished} value=${typeof value === 'number' ? value.toFixed(1) : value}`,
          )
        }}
        style={styles.puck}
      />
      <Text style={styles.log}>{endLog}</Text>
      <Pressable onPress={() => setSeed((n) => n + 1)} style={styles.button}>
        <Text style={styles.buttonLabel}>Throw</Text>
      </Pressable>
    </ScreenShell>
  )
}

function pseudoRandomVelocity(seed: number): number {
  // Deterministic-ish velocity in [-1500, 1500] excluding the dead zone near 0.
  const x = Math.sin(seed * 12.9898) * 43758.5453
  const v = (x - Math.floor(x)) * 3000 - 1500
  return Math.abs(v) < 400 ? v + Math.sign(v || 1) * 400 : v
}

const styles = StyleSheet.create({
  puck: {
    width: 64,
    height: 64,
    backgroundColor: '#ec4899',
    borderRadius: 32,
  },
  log: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: '#374151',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
  },
})
