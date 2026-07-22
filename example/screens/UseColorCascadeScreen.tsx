import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion, useBooleanSpring, useColorCascade } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * `useColorCascade` composites a priority-ordered stack of color layers over a
 * base `rest` color — each layer owns its own progress value and later layers
 * win as their progress rises. It is the values-layer form of the same
 * fixed-priority cascade the `gesture` prop uses (Decision 5), for state colors
 * that don't come from gestures (error, selected, dragged, …).
 *
 * This screen mirrors the canonical case that surfaced the hook: a text-field
 * border whose color cascades rest → hover → error → focus. Toggle the three
 * states independently and watch the higher-priority active layer win — focus
 * (topmost) overrides error overrides hover, each animating in on its own
 * boolean spring.
 */
const REST = '#79747e'
const HOVER = '#49454f'
const ERROR = '#b3261e'
const FOCUS = '#6750a4'

export function UseColorCascadeScreen({ onBack }: { onBack: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [errored, setErrored] = useState(false)
  const [focused, setFocused] = useState(false)

  const hoverP = useBooleanSpring(hovered, { tension: 200, friction: 22 })
  const errorP = useBooleanSpring(errored, { tension: 200, friction: 22 })
  const focusP = useBooleanSpring(focused, { tension: 200, friction: 22 })

  // Priority order, lowest first — focus (last) wins over error wins over hover.
  const borderStyle = useColorCascade(
    REST,
    [
      { progress: hoverP, color: HOVER },
      { progress: errorP, color: ERROR },
      { progress: focusP, color: FOCUS },
    ],
    { key: 'borderColor' },
  )

  return (
    <ScreenShell
      title="useColorCascade"
      description="Priority-ordered layered color crossfade. The border cascades rest → hover → error → focus; each state is an independent boolean spring, and the highest-priority active layer wins."
      onBack={onBack}
    >
      <Motion.View style={[styles.field, borderStyle]}>
        <Text style={styles.fieldLabel}>Border color</Text>
      </Motion.View>

      <View style={styles.toggles}>
        <Toggle
          label="Hover"
          active={hovered}
          onPress={() => setHovered((v) => !v)}
        />
        <Toggle
          label="Error"
          active={errored}
          onPress={() => setErrored((v) => !v)}
        />
        <Toggle
          label="Focus"
          active={focused}
          onPress={() => setFocused((v) => !v)}
        />
      </View>
    </ScreenShell>
  )
}

function Toggle({
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
      style={({ pressed }) => [
        styles.toggle,
        active && styles.toggleActive,
        pressed && styles.togglePressed,
      ]}
    >
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: {
    height: 88,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3f3f46',
  },
  toggles: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  togglePressed: {
    opacity: 0.7,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3f3f46',
  },
  toggleLabelActive: {
    color: '#ffffff',
  },
})
