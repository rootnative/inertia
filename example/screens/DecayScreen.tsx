import { StyleSheet, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { Motion } from '@onlynative/inertia'
import { useDrag } from '@onlynative/inertia-gestures'
import { ScreenShell } from './ScreenShell'

const TRACK_WIDTH = 280
const PUCK = 64
const MAX = (TRACK_WIDTH - PUCK) / 2

/**
 * Drag-and-release decay demo. Pan the puck horizontally, release it, and the
 * SV continues with `withDecay` momentum — clamped to the track bounds. Routes
 * through `useDrag({ onRelease })` so the release config comes from Inertia's
 * transition vocabulary (`type: 'decay'`), not raw Reanimated.
 */
export function DecayScreen({ onBack }: { onBack: () => void }) {
  const drag = useDrag({
    axis: 'x',
    constraints: { left: -MAX, right: MAX },
    onRelease: (e) => {
      'worklet'
      return {
        x: {
          type: 'decay',
          velocity: e.velocity.x,
          deceleration: 0.997,
          clamp: [-MAX, MAX],
        },
      }
    },
  })

  return (
    <ScreenShell
      title="Decay"
      description="Drag the puck and release. withDecay keeps it gliding until friction stops it or it hits the bounds."
      onBack={onBack}
      fill
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.track}>
          <GestureDetector gesture={drag.gesture}>
            <Motion.View style={[styles.puck, drag.animatedStyle]} />
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
  },
  track: {
    width: TRACK_WIDTH,
    height: PUCK + 24,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  puck: {
    width: PUCK,
    height: PUCK,
    backgroundColor: '#ec4899',
    borderRadius: PUCK / 2,
  },
})
