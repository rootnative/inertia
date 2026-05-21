import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { Motion } from '@onlynative/inertia'
import { useDrag } from '@onlynative/inertia-gestures'
import { ScreenShell } from './ScreenShell'

const TRACK_WIDTH = 280
const THUMB = 28
const TICK_COUNT = 5
const TICK_SPACING = (TRACK_WIDTH - THUMB) / (TICK_COUNT - 1)
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => i * TICK_SPACING)

type Mode = 'snap' | 'free'

/**
 * Snap-to-tick slider. The thumb drags horizontally; on release `onRelease`
 * picks a destination — nearest tick (snap mode) or a decay glide bounded by
 * the track (free mode) — and animates the SV to it via Inertia's transition
 * resolver. The release velocity stays on the UI thread the whole time.
 *
 * Mirrors the `@onlynative/ui` Slider migration pattern: hand-roll the
 * gesture math, but route the release animation through Inertia instead of
 * bare `withSpring` / `withDecay`.
 */
export function SliderScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('snap')

  return (
    <ScreenShell
      title="Slider — useDrag onRelease"
      description="Drag the thumb and release. Snap mode springs to the nearest tick; Free mode decays until friction or bounds stop it."
      onBack={onBack}
      fill
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.modes}>
          <ModeButton
            label="Snap to tick"
            active={mode === 'snap'}
            onPress={() => setMode('snap')}
          />
          <ModeButton
            label="Free decay"
            active={mode === 'free'}
            onPress={() => setMode('free')}
          />
        </View>
        <Slider key={mode} mode={mode} />
        <Text style={styles.hint}>{HINTS[mode]}</Text>
      </GestureHandlerRootView>
    </ScreenShell>
  )
}

const HINTS: Record<Mode, string> = {
  snap: 'Release picks the nearest tick. Spring uses the release velocity so flicks overshoot naturally before settling.',
  free: 'Release decays with momentum, clamped to the track. No snap.',
}

function Slider({ mode }: { mode: Mode }) {
  const drag = useDrag({
    axis: 'x',
    constraints: { left: 0, right: TRACK_WIDTH - THUMB },
    onRelease: (e) => {
      'worklet'
      if (mode === 'snap') {
        // Nearest-tick search on the UI thread.
        let snap = TICKS[0]!
        let bestDist = Math.abs(e.x - snap)
        for (let i = 1; i < TICKS.length; i++) {
          const d = Math.abs(e.x - TICKS[i]!)
          if (d < bestDist) {
            snap = TICKS[i]!
            bestDist = d
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
      }
      return {
        x: {
          type: 'decay',
          velocity: e.velocity.x,
          deceleration: 0.996,
          clamp: [0, TRACK_WIDTH - THUMB],
        },
      }
    },
  })

  // Static tick marks under the track so consumers can see where snap will land.
  const tickStyles = mode === 'snap' ? styles.tick : styles.tickHidden

  return (
    <View style={styles.track}>
      <View style={styles.ticks}>
        {TICKS.map((_, i) => (
          <View key={i} style={tickStyles} />
        ))}
      </View>
      <GestureDetector gesture={drag.gesture}>
        <Motion.View style={[styles.thumb, drag.animatedStyle]} />
      </GestureDetector>
    </View>
  )
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={active ? styles.modeButtonActive : styles.modeButton}
    >
      <Text style={active ? styles.modeLabelActive : styles.modeLabel}>
        {label}
      </Text>
    </Pressable>
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
  modes: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  modeButtonActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 999,
  },
  modeLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  modeLabelActive: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
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
  tickHidden: {
    width: 2,
    height: 10,
    backgroundColor: 'transparent',
    marginTop: -4,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#4f46e5',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
})
