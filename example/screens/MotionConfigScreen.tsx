import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion, MotionConfig, type ReducedMotion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

const MODES: ReducedMotion[] = ['user', 'never', 'always']

export function MotionConfigScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<ReducedMotion>('user')
  const [on, setOn] = useState(false)
  return (
    <ScreenShell
      title="MotionConfig"
      description="reducedMotion='user' follows the OS setting. 'always' snaps to the target, 'never' forces motion regardless of accessibility settings."
      onBack={onBack}
    >
      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.chip, mode === m && styles.chipActive]}
          >
            <Text
              style={[styles.chipLabel, mode === m && styles.chipLabelActive]}
            >
              {m}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.caption}>
        {mode === 'user'
          ? 'Following OS reduce-motion setting'
          : mode === 'always'
            ? 'Forcing reduce-motion: animations should snap'
            : 'Forcing motion: animations always play'}
      </Text>
      <MotionConfig reducedMotion={mode}>
        <Motion.View
          animate={{
            translateX: on ? 80 : -80,
            scaleX: on ? 1.2 : 1,
            scaleY: on ? 1.2 : 1,
          }}
          transition={{ type: 'spring', tension: 180, friction: 14 }}
          style={styles.box}
        />
      </MotionConfig>
      <Pressable onPress={() => setOn((o) => !o)} style={styles.button}>
        <Text style={styles.buttonLabel}>Toggle</Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: '#4f46e5',
  },
  chipLabel: {
    color: '#374151',
    fontWeight: '600',
  },
  chipLabelActive: {
    color: 'white',
  },
  caption: {
    fontSize: 13,
    color: '#6b7280',
  },
  box: {
    width: 96,
    height: 96,
    backgroundColor: '#10b981',
    borderRadius: 16,
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
