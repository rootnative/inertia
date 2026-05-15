import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useAnimation, useGesture } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

// Material Design 3 spec — track / thumb / halo geometry. Pulled from the
// onlynative/ui Switch (packages/components/src/switch/styles.ts) so this
// demo lines up pixel-for-pixel with the real component.
const TRACK_WIDTH = 52
const TRACK_HEIGHT = 32
const TRACK_PADDING = 4
const TRACK_BORDER_WIDTH = 2
const THUMB_OFF_SIZE = 16
const THUMB_ON_SIZE = 24
const THUMB_PRESSED_SIZE = 28
const STATE_LAYER_SIZE = 40
const FOCUS_RING_OFFSET = 2
const FOCUS_RING_WIDTH = 3
const THUMB_TRANSLATE_X = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB_ON_SIZE

// MD3 state-layer opacity tokens.
const HOVER_OPACITY = 0.08
const FOCUS_OPACITY = 0.1
const PRESS_OPACITY = 0.1

// MD3 emphasized spring for the toggle (slight overshoot, ~0.85 damping ratio).
// The same numbers as the upstream component, just renamed: stiffness→tension,
// damping→friction. Identity rename — no physics change.
const TOGGLE_TRANSITION = {
  type: 'spring' as const,
  tension: 380,
  friction: 33,
  mass: 1,
}

// Per-layer fades. Press is fast (120 ms) to keep the 28 dp thumb-grow
// snappy; hover is medium; focus is the slowest so the ring fade is calm.
const GESTURE_TRANSITION = {
  pressed: { type: 'timing' as const, duration: 120 },
  hovered: { type: 'timing' as const, duration: 150 },
  focused: { type: 'timing' as const, duration: 200 },
  focusVisible: { type: 'timing' as const, duration: 200 },
}

const COLORS = {
  on: {
    track: '#4f46e5',
    border: 'transparent',
    thumb: '#ffffff',
  },
  off: {
    track: '#e5e7eb',
    border: '#9ca3af',
    thumb: '#6b7280',
  },
}

export function MD3SwitchScreen({ onBack }: { onBack: () => void }) {
  const [singleValue, setSingleValue] = useState(false)
  const [wifi, setWifi] = useState(true)
  const [bluetooth, setBluetooth] = useState(false)
  const [airplane, setAirplane] = useState(false)

  return (
    <ScreenShell
      title="MD3 Switch — ported"
      description="Faithful port of the @onlynative/ui Switch using useAnimation (toggle progress) and useGesture (state layers). The animation plumbing shrinks from ~37 lines to 2 hook calls."
      onBack={onBack}
    >
      <View style={styles.demo}>
        <Text style={styles.demoLabel}>Standalone</Text>
        <MD3Switch value={singleValue} onValueChange={setSingleValue} />
        <Text style={styles.demoBody}>
          Tab to focus, press to toggle. The thumb grows to 28 dp while pressed
          and the halo opacity uses MD3 max-blend across hovered, focused, and
          pressed.
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Wi-Fi</Text>
        <MD3Switch value={wifi} onValueChange={setWifi} />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Bluetooth</Text>
        <MD3Switch value={bluetooth} onValueChange={setBluetooth} />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Airplane mode</Text>
        <MD3Switch value={airplane} onValueChange={setAirplane} />
      </View>
    </ScreenShell>
  )
}

interface MD3SwitchProps {
  value: boolean
  onValueChange: (next: boolean) => void
}

function MD3Switch({ value, onValueChange }: MD3SwitchProps) {
  // ONE hook call for the toggle progress (used to be useSharedValue +
  // useEffect + withSpring). Spring physics in react-spring vocab.
  const progress = useAnimation(value ? 1 : 0, TOGGLE_TRANSITION)

  // ONE hook call for press / focus / focusVisible / hover (used to be
  // three useSharedValue calls + six useCallback handlers).
  // `focusVisible` is what the focus ring reads — it tracks keyboard focus
  // only, matching W3C `:focus-visible`.
  const { pressed, focused, focusVisible, hovered, handlers } =
    useGesture(GESTURE_TRANSITION)

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.off.track, COLORS.on.track],
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.off.border, COLORS.on.border],
    ),
  }))

  const thumbStyle = useAnimatedStyle(() => {
    const baseSize = interpolate(
      progress.value,
      [0, 1],
      [THUMB_OFF_SIZE, THUMB_ON_SIZE],
    )
    const size = interpolate(
      pressed.value,
      [0, 1],
      [baseSize, THUMB_PRESSED_SIZE],
    )
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [COLORS.off.thumb, COLORS.on.thumb],
      ),
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [0, THUMB_TRANSLATE_X],
          ),
        },
      ],
    }
  })

  // Halo's static left positions it under the thumb's center at progress 0.
  // The transform tracks the thumb as progress moves and as the thumb grows
  // on press (its left edge is fixed, so its center moves by half the size
  // delta).
  const haloLeft =
    TRACK_PADDING -
    TRACK_BORDER_WIDTH +
    THUMB_OFF_SIZE / 2 -
    STATE_LAYER_SIZE / 2

  const haloStyle = useAnimatedStyle(() => {
    const baseSize = interpolate(
      progress.value,
      [0, 1],
      [THUMB_OFF_SIZE, THUMB_ON_SIZE],
    )
    const size = interpolate(
      pressed.value,
      [0, 1],
      [baseSize, THUMB_PRESSED_SIZE],
    )
    return {
      // MD3 spec: opacity is the max of each contributing layer's
      // intensity. The gesture prop's lerp model can't express this; the
      // hook gives us the raw progress shared values so we can do max here.
      opacity: Math.max(
        hovered.value * HOVER_OPACITY,
        focused.value * FOCUS_OPACITY,
        pressed.value * PRESS_OPACITY,
      ),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [COLORS.off.thumb, COLORS.on.thumb],
      ),
      transform: [
        {
          translateX:
            progress.value * THUMB_TRANSLATE_X + (size - THUMB_OFF_SIZE) / 2,
        },
      ],
    }
  })

  // Focus ring is a sibling overlay — the gesture prop can't reach it.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: focusVisible.value,
  }))

  return (
    <View style={styles.wrapper}>
      <Animated.View
        pointerEvents="none"
        style={[styles.focusRing, ringStyle]}
      />
      <AnimatedPressable
        {...handlers}
        accessibilityRole="switch"
        accessibilityState={{ checked: value }}
        hitSlop={4}
        onPress={() => onValueChange(!value)}
        style={[styles.track, trackStyle]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { left: haloLeft }, haloStyle]}
        />
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </AnimatedPressable>
    </View>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const styles = StyleSheet.create({
  demo: {
    width: 280,
    gap: 12,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  demoBody: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    textAlign: 'center',
  },
  row: {
    width: 280,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 15,
    color: '#111827',
  },
  wrapper: {
    width: TRACK_WIDTH + (FOCUS_RING_OFFSET + FOCUS_RING_WIDTH) * 2,
    height: TRACK_HEIGHT + (FOCUS_RING_OFFSET + FOCUS_RING_WIDTH) * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: {
    position: 'absolute',
    width: TRACK_WIDTH + (FOCUS_RING_OFFSET + FOCUS_RING_WIDTH) * 2,
    height: TRACK_HEIGHT + (FOCUS_RING_OFFSET + FOCUS_RING_WIDTH) * 2,
    borderRadius:
      (TRACK_HEIGHT + (FOCUS_RING_OFFSET + FOCUS_RING_WIDTH) * 2) / 2,
    borderWidth: FOCUS_RING_WIDTH,
    borderColor: '#4f46e5',
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: TRACK_BORDER_WIDTH,
    paddingHorizontal: TRACK_PADDING - TRACK_BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING - TRACK_BORDER_WIDTH,
  },
  halo: {
    position: 'absolute',
    top: -(STATE_LAYER_SIZE - TRACK_HEIGHT) / 2,
    width: STATE_LAYER_SIZE,
    height: STATE_LAYER_SIZE,
    borderRadius: STATE_LAYER_SIZE / 2,
  },
})
