import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion, Stagger } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

// One row color per list entry — deliberately saturated so every row
// contrasts against the shell's white background (the standing demo-screen
// pre-flight check: white-on-white fails silently).
const ROW_COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a78bfa', '#c084fc']

const ROW_TRANSITION = { type: 'spring', tension: 220, friction: 20 } as const

export function StaggerScreen({ onBack }: { onBack: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const [fromLast, setFromLast] = useState(false)
  return (
    <ScreenShell
      title="Stagger"
      description="The parent assigns each child's delay from its position — no per-child index math. `enabled` follows the reveal, so hiding animates every row together instead of cascading back out."
      onBack={onBack}
    >
      <View style={styles.controls}>
        <Pressable onPress={() => setRevealed((r) => !r)} style={styles.toggle}>
          <Text style={styles.toggleLabel}>{revealed ? 'Hide' : 'Reveal'}</Text>
        </Pressable>
        <Pressable
          onPress={() => setFromLast((f) => !f)}
          style={styles.toggleSecondary}
        >
          <Text style={styles.toggleSecondaryLabel}>
            {fromLast ? "from='last'" : "from='first'"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        <Stagger
          interval={70}
          from={fromLast ? 'last' : 'first'}
          enabled={revealed}
        >
          {ROW_COLORS.map((color, index) => (
            <Motion.View
              key={color}
              animate={{
                opacity: revealed ? 1 : 0,
                translateX: revealed ? 0 : -32,
              }}
              transition={ROW_TRANSITION}
              style={rowStyles[index]}
            />
          ))}
        </Stagger>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  toggleLabel: {
    color: 'white',
    fontWeight: '600',
  },
  toggleSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  toggleSecondaryLabel: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  list: {
    width: 240,
    gap: 10,
  },
  row: {
    height: 36,
    borderRadius: 10,
  },
})

// Per-row style arrays built once at module scope (below `styles`, which they
// read) — no inline style objects in JSX, and stable identities across
// renders.
const rowStyles = ROW_COLORS.map((backgroundColor) => [
  styles.row,
  { backgroundColor },
])
