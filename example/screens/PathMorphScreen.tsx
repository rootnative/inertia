import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { MotionCircle, MotionPath } from '@rootnative/inertia-svg'
import { ScreenShell } from './ScreenShell'

// Three structurally-compatible silhouettes (M + 5 Ls + Z). Element-wise
// interpolation between any pair produces a smooth shape morph because every
// path has the same command sequence after implicit-repeat expansion.
const SHAPES = [
  {
    name: 'Star',
    d: 'M 50 8 L 61 38 L 92 38 L 67 58 L 76 88 L 50 70 Z',
    fill: '#f59e0b',
    stroke: '#92400e',
  },
  {
    name: 'Diamond',
    d: 'M 50 8 L 80 30 L 80 58 L 50 88 L 20 58 L 20 30 Z',
    fill: '#0ea5e9',
    stroke: '#075985',
  },
  {
    name: 'Heart',
    d: 'M 50 30 L 70 12 L 90 30 L 50 88 L 10 30 L 30 12 Z',
    fill: '#ef4444',
    stroke: '#991b1b',
  },
] as const

// Circular-progress geometry for the MotionCircle demo below — the classic
// dashoffset trick: dasharray = circumference, offset animates toward 0.
const RING_RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const PROGRESS_STEPS = [0.15, 0.45, 0.75, 1] as const

export function PathMorphScreen({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0)
  const [progressStep, setProgressStep] = useState(0)
  const shape = SHAPES[index]!
  const progress = PROGRESS_STEPS[progressStep]!

  return (
    <ScreenShell
      title="Path morphing"
      description="MotionPath animates the d attribute element-wise via withSpring. Source and target paths must share the same command sequence — see CLAUDE.md for the structural-compatibility rule. Lives in @rootnative/inertia-svg."
      onBack={onBack}
    >
      <Text style={styles.caption}>Shape: {shape.name}</Text>
      <View style={styles.stage}>
        <Svg viewBox="0 0 100 100" width={220} height={220}>
          <MotionPath
            d={SHAPES[0]!.d}
            fill={SHAPES[0]!.fill}
            stroke={SHAPES[0]!.stroke}
            strokeWidth={3}
            animate={{
              d: shape.d,
              fill: shape.fill,
              stroke: shape.stroke,
            }}
            transition={{
              d: { type: 'spring', tension: 120, friction: 14 },
              fill: { type: 'timing', duration: 400 },
              stroke: { type: 'timing', duration: 400 },
            }}
          />
        </Svg>
      </View>

      <View style={styles.row}>
        {SHAPES.map((s, i) => (
          <Pressable
            key={s.name}
            onPress={() => setIndex(i)}
            style={[styles.chip, i === index && styles.chipActive]}
          >
            <Text
              style={i === index ? styles.chipLabelActive : styles.chipLabel}
            >
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.note}>
        Tap a shape to morph the silhouette. All three paths share the same M +
        5×L + Z command sequence; element-wise interpolation between any pair is
        well-defined.
      </Text>

      <Text style={styles.caption}>
        MotionCircle progress ring: {Math.round(progress * 100)}%
      </Text>
      <View style={styles.stage}>
        <Pressable
          onPress={() =>
            setProgressStep((s) => (s + 1) % PROGRESS_STEPS.length)
          }
        >
          <Svg viewBox="0 0 100 100" width={140} height={140}>
            <Circle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              stroke="#1e293b"
              strokeWidth={8}
              fill="none"
            />
            <MotionCircle
              cx={50}
              cy={50}
              r={RING_RADIUS}
              stroke="#38bdf8"
              strokeWidth={8}
              strokeLinecap="round"
              fill="none"
              rotation={-90}
              origin="50, 50"
              strokeDasharray={[CIRCUMFERENCE]}
              strokeDashoffset={CIRCUMFERENCE}
              animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
              transition={{ type: 'spring', tension: 120, friction: 20 }}
            />
          </Svg>
        </Pressable>
      </View>

      <Text style={styles.note}>
        Tap the ring to advance the progress. MotionCircle comes from
        createMotionSvgComponent — strokeDashoffset is a plain animatable
        numeric prop, no useAnimatedProps needed.
      </Text>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stage: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  chipLabel: {
    color: '#374151',
    fontSize: 14,
  },
  chipLabelActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
})
