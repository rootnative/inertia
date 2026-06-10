import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MotionLinearGradient } from '@rootnative/inertia-gradients'
import { ScreenShell } from './ScreenShell'

const PALETTES = [
  {
    name: 'Sunrise',
    colors: ['#fb923c', '#f43f5e'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  {
    name: 'Noon',
    colors: ['#38bdf8', '#0ea5e9'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  {
    name: 'Sunset',
    colors: ['#a855f7', '#ec4899'] as const,
    start: { x: 0, y: 1 },
    end: { x: 1, y: 0 },
  },
  {
    name: 'Night',
    colors: ['#0f172a', '#1e293b'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
] as const

export function LinearGradientScreen({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0)
  const palette = PALETTES[index]!

  return (
    <ScreenShell
      title="Linear gradient"
      description="MotionLinearGradient animates colors, start, and end with the same animate/transition shape as the core Motion.* primitives. Lives in @rootnative/inertia-gradients."
      onBack={onBack}
    >
      <Text style={styles.caption}>Palette: {palette.name}</Text>
      <View style={styles.hero}>
        <MotionLinearGradient
          colors={palette.colors}
          start={palette.start}
          end={palette.end}
          animate={{
            colors: palette.colors,
            start: palette.start,
            end: palette.end,
          }}
          transition={{
            colors: { type: 'timing', duration: 700 },
            start: { type: 'spring', tension: 80, friction: 14 },
            end: { type: 'spring', tension: 80, friction: 14 },
          }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.heroLabel}>{palette.name}</Text>
      </View>

      <View style={styles.row}>
        {PALETTES.map((p, i) => (
          <Pressable
            key={p.name}
            onPress={() => setIndex(i)}
            style={[styles.swatchWrapper, i === index && styles.swatchActive]}
          >
            <MotionLinearGradient
              colors={p.colors}
              start={p.start}
              end={p.end}
              style={styles.swatch}
            />
            <Text style={styles.swatchLabel}>{p.name}</Text>
          </Pressable>
        ))}
      </View>
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
  hero: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroLabel: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  swatchWrapper: {
    width: 80,
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 12,
  },
  swatchActive: {
    backgroundColor: '#e5e7eb',
  },
  swatch: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  swatchLabel: {
    fontSize: 12,
    color: '#374151',
  },
})
