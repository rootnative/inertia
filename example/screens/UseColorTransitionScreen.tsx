import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import {
  Motion,
  useBooleanSpring,
  useColorTransition,
} from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * `useColorTransition` is the value-layer escape hatch for color tweening —
 * it maps a `progress` shared value (0→1) onto an animated style fragment
 * for a single color slot. Whatever drives `progress` is the caller's
 * concern: a `useBooleanSpring`, a scroll-derived `useTransform`, a gesture
 * progress value, anything.
 *
 * This screen drives two color channels (`backgroundColor` and
 * `borderColor`) from the *same* boolean spring, so the chip's fill and
 * ring shift in lockstep on the spring curve. The chip itself has no
 * `animate` prop — both styles are produced by the hook and spread.
 */
export function UseColorTransitionScreen({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState(false)
  const progress = useBooleanSpring(active, { tension: 200, friction: 18 })

  const fillStyle = useColorTransition(progress, ['#e5e7eb', '#4f46e5'])
  const ringStyle = useColorTransition(progress, ['#d1d5db', '#312e81'], {
    key: 'borderColor',
  })
  const labelStyle = useColorTransition(progress, ['#111827', '#ffffff'], {
    key: 'color',
  })

  return (
    <ScreenShell
      title="useColorTransition"
      description="Drive a single color channel from any progress source. Here a useBooleanSpring toggles 0↔1; backgroundColor, borderColor, and color all follow the same spring curve from one shared driver."
      onBack={onBack}
    >
      <Motion.View style={[styles.chip, fillStyle, ringStyle]}>
        <Motion.Text style={[styles.chipLabel, labelStyle]}>
          {active ? 'Selected' : 'Unselected'}
        </Motion.Text>
      </Motion.View>

      <Pressable
        onPress={() => setActive((a) => !a)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonLabel}>{active ? 'Deselect' : 'Select'}</Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 2,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  buttonPressed: {
    backgroundColor: '#4338ca',
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
})
