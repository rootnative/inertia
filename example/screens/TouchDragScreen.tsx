import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { useTouchDrag } from '@onlynative/inertia/touch'
import { ScreenShell } from './ScreenShell'

const TRACK_WIDTH = 280
const THUMB = 28
const STEPS = 5
const SPACING = (TRACK_WIDTH - THUMB) / (STEPS - 1)
const TICKS = Array.from({ length: STEPS }, (_, i) => i * SPACING)

/**
 * PanResponder-backed drag demo. Mirrors the gesture-handler `SliderScreen`
 * but uses `useTouchDrag` from `@onlynative/inertia/touch` — no
 * `react-native-gesture-handler` peer required, and keyboard a11y composes
 * cleanly via `onKeyDown` on the wrapping `Pressable`.
 *
 * Release picks the nearest tick and springs in with the release velocity,
 * via Inertia's transition resolver.
 */
export function TouchDragScreen({ onBack }: { onBack: () => void }) {
  const drag = useTouchDrag({
    axis: 'x',
    constraints: { left: 0, right: TRACK_WIDTH - THUMB },
    onRelease: (e) => {
      let snap = TICKS[0]!
      let best = Math.abs(e.x - snap)
      for (let i = 1; i < TICKS.length; i++) {
        const d = Math.abs(e.x - TICKS[i]!)
        if (d < best) {
          snap = TICKS[i]!
          best = d
        }
      }
      return {
        x: {
          type: 'spring',
          to: snap,
          velocity: e.velocity.x,
          tension: 200,
          friction: 22,
        },
      }
    },
  })

  // Keyboard step — the differentiator. Move one tick per arrow press.
  const handleKey = useCallback(
    (e: { nativeEvent: { key?: string } }) => {
      const key = e.nativeEvent.key
      if (key !== 'ArrowLeft' && key !== 'ArrowRight') return
      const dir = key === 'ArrowRight' ? 1 : -1
      const next = Math.max(
        0,
        Math.min(TRACK_WIDTH - THUMB, drag.dragX.value + dir * SPACING),
      )
      drag.dragX.value = next
    },
    [drag.dragX],
  )

  return (
    <ScreenShell
      title="Touch drag — useTouchDrag"
      description="PanResponder-backed drag. No gesture-handler dependency. Drag the thumb or tab + arrow keys for keyboard a11y."
      onBack={onBack}
      fill
    >
      <View style={styles.root}>
        <View style={styles.track}>
          <View style={styles.ticks}>
            {TICKS.map((_, i) => (
              <View key={i} style={styles.tick} />
            ))}
          </View>
          <Pressable
            accessibilityRole="adjustable"
            onKeyDown={handleKey}
            {...drag.panHandlers}
            style={styles.thumbHit}
          >
            <Motion.View style={[styles.thumb, drag.animatedStyle]} />
          </Pressable>
        </View>
        <Text style={styles.hint}>
          Drag or use arrow keys. Release snaps to the nearest tick using the
          release velocity for natural overshoot.
        </Text>
      </View>
    </ScreenShell>
  )
}

// PressableProps.onKeyDown is web-only (RN-Web augmentation). RN's upstream
// types omit it; declare locally so this file compiles cleanly.
declare module 'react-native' {
  interface PressableProps {
    onKeyDown?: (event: { nativeEvent: { key?: string } }) => void
  }
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
    height: THUMB + 24,
    justifyContent: 'center',
  },
  ticks: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    top: '50%',
    height: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tick: {
    width: 2,
    height: 10,
    backgroundColor: '#d1d5db',
    marginTop: -4,
  },
  thumbHit: {
    width: THUMB,
    height: THUMB,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#0ea5e9',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
})
