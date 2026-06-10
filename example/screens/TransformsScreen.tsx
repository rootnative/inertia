import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

// Each tile demonstrates one rotation axis. `rotate` spins in the screen
// plane; `rotateX` / `rotateY` only read as 3D when the parent has a
// `perspective` transform — without it the foreshortening collapses and the
// tile just appears to scale on one axis.

export function TransformsScreen({ onBack }: { onBack: () => void }) {
  const [on, setOn] = useState(false)
  return (
    <ScreenShell
      title="Transforms"
      description="rotate, rotateX, and rotateY take numeric degrees. rotateX / rotateY need a perspective ancestor to render with depth."
      onBack={onBack}
    >
      <Pressable onPress={() => setOn((o) => !o)} style={styles.button}>
        <Text style={styles.buttonLabel}>Toggle</Text>
      </Pressable>

      <View style={styles.tileRow}>
        <View style={styles.tileColumn}>
          <Motion.View
            animate={{ rotate: on ? 180 : 0 }}
            transition={{ type: 'spring', tension: 180, friction: 14 }}
            style={styles.tile}
          />
          <Text style={styles.tileLabel}>rotate</Text>
        </View>

        <View style={styles.perspectiveHost}>
          <Motion.View
            animate={{ rotateX: on ? 180 : 0 }}
            transition={{ type: 'spring', tension: 160, friction: 14 }}
            style={styles.tile}
          />
          <Text style={styles.tileLabel}>rotateX</Text>
        </View>

        <View style={styles.perspectiveHost}>
          <Motion.View
            animate={{ rotateY: on ? 180 : 0 }}
            transition={{ type: 'spring', tension: 160, friction: 14 }}
            style={styles.tile}
          />
          <Text style={styles.tileLabel}>rotateY</Text>
        </View>
      </View>

      <Motion.View
        animate={{
          rotate: on ? 360 : 0,
          rotateX: on ? 45 : 0,
          rotateY: on ? 45 : 0,
        }}
        transition={{ type: 'spring', tension: 140, friction: 18 }}
        style={styles.combined}
      />
      <Text style={styles.tileLabel}>combined</Text>
    </ScreenShell>
  )
}

// `perspective` is a transform entry, not a top-level ViewStyle key, so we
// apply it through the wrapper's transform array. 800 is the canonical
// "browser-like" depth — close enough that 45–180° rotations show real
// foreshortening without looking warped.
const PERSPECTIVE_TRANSFORM = [{ perspective: 800 }]

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
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  tileColumn: {
    alignItems: 'center',
    gap: 8,
  },
  perspectiveHost: {
    alignItems: 'center',
    gap: 8,
    transform: PERSPECTIVE_TRANSFORM,
  },
  tile: {
    width: 72,
    height: 72,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
  },
  tileLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  combined: {
    marginTop: 16,
    width: 96,
    height: 96,
    backgroundColor: '#10b981',
    borderRadius: 16,
  },
})
