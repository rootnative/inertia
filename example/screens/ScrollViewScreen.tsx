import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

const ROWS = Array.from({ length: 24 }, (_, i) => i + 1)

export function ScrollViewScreen({ onBack }: { onBack: () => void }) {
  const [mounted, setMounted] = useState(true)
  return (
    <ScreenShell
      title="Motion.ScrollView"
      description="A ScrollView that animates its mount. Toggle to remount and watch initial → animate replay."
      onBack={onBack}
    >
      <Pressable onPress={() => setMounted((m) => !m)} style={styles.toggle}>
        <Text style={styles.toggleLabel}>{mounted ? 'Hide' : 'Show'} list</Text>
      </Pressable>
      {mounted ? (
        <Motion.ScrollView
          initial={{ opacity: 0, translateY: 24 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            opacity: { type: 'timing', duration: 240 },
            translateY: { type: 'spring', tension: 200, friction: 18 },
          }}
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          {ROWS.map((n) => (
            <View key={n} style={styles.row}>
              <Text style={styles.rowLabel}>Row {n}</Text>
            </View>
          ))}
        </Motion.ScrollView>
      ) : null}
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
  toggleLabel: {
    color: 'white',
    fontWeight: '600',
  },
  scroll: {
    width: '100%',
    maxHeight: 360,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 16,
    color: '#111827',
  },
})
