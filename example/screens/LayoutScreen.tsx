import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

type Item = { id: string; label: string; color: string }

const ITEMS: ReadonlyArray<Item> = [
  { id: 'a', label: 'Alpha', color: '#ef4444' },
  { id: 'b', label: 'Bravo', color: '#f59e0b' },
  { id: 'c', label: 'Charlie', color: '#10b981' },
  { id: 'd', label: 'Delta', color: '#3b82f6' },
  { id: 'e', label: 'Echo', color: '#8b5cf6' },
]

export function LayoutScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<ReadonlyArray<Item>>(ITEMS)
  const [expanded, setExpanded] = useState<string | null>(null)

  const reorder = () => {
    setItems((prev) => {
      const next = prev.slice()
      const [first] = next.splice(0, 1)
      if (first) next.push(first)
      return next
    })
  }
  const reset = () => setItems(ITEMS)
  const toggle = (id: string) =>
    setExpanded((curr) => (curr === id ? null : id))

  return (
    <ScreenShell
      title="Layout"
      description="The layout prop bridges to Reanimated's LinearTransition — position and size changes interpolate instead of snapping. Reorder the list or toggle a row to see it."
      onBack={onBack}
    >
      <View style={styles.toolbar}>
        <Pressable onPress={reorder} style={styles.button}>
          <Text style={styles.buttonLabel}>Rotate first → last</Text>
        </Pressable>
        <Pressable onPress={reset} style={styles.buttonSecondary}>
          <Text style={styles.buttonSecondaryLabel}>Reset</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {items.map((item) => {
          const rowStyle = {
            backgroundColor: item.color,
            height: expanded === item.id ? 96 : 56,
          }
          return (
            <Motion.Pressable
              key={item.id}
              layout={{ type: 'spring', tension: 200, friction: 22 }}
              onPress={() => toggle(item.id)}
              style={[styles.row, rowStyle]}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowHint}>
                {expanded === item.id ? 'Tap to collapse' : 'Tap to expand'}
              </Text>
            </Motion.Pressable>
          )
        })}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>What&apos;s animating</Text>
        <Text style={styles.noteBody}>
          Position changes when the order shuffles — every row springs to its
          new slot.
        </Text>
        <Text style={styles.noteBody}>
          Size changes when a row toggles between 56 and 96 — the height
          interpolates instead of snapping.
        </Text>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
  },
  buttonLabel: {
    color: 'white',
    fontWeight: '600',
  },
  buttonSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  buttonSecondaryLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  list: {
    width: 280,
    gap: 10,
  },
  row: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  rowHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  note: {
    width: 280,
    gap: 6,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  noteBody: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
})
