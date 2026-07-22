import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import {
  Motion,
  useBooleanSpring,
  useInterpolatedStyle,
} from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * `useInterpolatedStyle` maps ONE progress shared value onto N style props at
 * once, returning a spreadable animated style fragment. It's the multi-key
 * counterpart to `useTransform`'s output-range form: instead of one
 * interpolated value to compose by hand, you hand it a whole map and get a
 * ready-to-spread fragment back.
 *
 * This screen drives everything from a single `useBooleanSpring`:
 *  - the container fragment interpolates `height` + `borderRadius` (numeric)
 *    and `backgroundColor` (color) together;
 *  - the label fragment lifts `translateY` + `scale` into a transform array —
 *    the Material-style floating label, from one driver.
 */
export function UseInterpolatedStyleScreen({ onBack }: { onBack: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const progress = useBooleanSpring(expanded, { tension: 180, friction: 16 })

  // Numeric keys + a color key, all from one driver.
  const cardStyle = useInterpolatedStyle(progress, {
    height: [72, 148],
    borderRadius: [12, 24],
    backgroundColor: ['#eef2ff', '#4f46e5'],
  })

  // Transform keys lift into a `transform` array in map key-order.
  const labelStyle = useInterpolatedStyle(progress, {
    translateY: [0, -8],
    scale: [1, 1.15],
    color: ['#4338ca', '#ffffff'],
  })

  return (
    <ScreenShell
      title="useInterpolatedStyle"
      description="One progress value → many style props. A single useBooleanSpring drives the card's height, borderRadius, and backgroundColor plus the label's translateY + scale + color — each returned as a spreadable fragment, no hand-rolled useAnimatedStyle."
      onBack={onBack}
    >
      <Motion.View style={[styles.card, cardStyle]}>
        <Motion.Text style={[styles.cardLabel, labelStyle]}>
          {expanded ? 'Expanded' : 'Collapsed'}
        </Motion.Text>
      </Motion.View>

      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonLabel}>
          {expanded ? 'Collapse' : 'Expand'}
        </Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '700',
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
