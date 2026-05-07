import { StyleSheet, Text, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { Motion } from '@onlynative/inertia'
import { usePan } from '@onlynative/inertia-gestures'
import { ScreenShell } from './ScreenShell'

const VIEWPORT = 280
const CANVAS = 600
const MAX = (CANVAS - VIEWPORT) / 2

export function PanScreen({ onBack }: { onBack: () => void }) {
  const pan = usePan({
    constraints: { left: -MAX, right: MAX, top: -MAX, bottom: MAX },
    deceleration: 0.997,
  })

  const canvasStyle = [styles.canvas, pan.animatedStyle]

  return (
    <ScreenShell title="Pan (with momentum)" onBack={onBack}>
      <GestureHandlerRootView style={styles.root}>
        <Text style={styles.hint}>
          Drag the canvas. On release, momentum carries it until friction
          stops or it hits the bounds.
        </Text>
        <View style={styles.viewport}>
          <GestureDetector gesture={pan.gesture}>
            <Motion.View style={canvasStyle}>
              {GRID_LINES.map((row, ri) => (
                <View key={ri} style={styles.row}>
                  {row.map((cell, ci) => (
                    <View
                      key={ci}
                      style={cell ? styles.cellAccent : styles.cell}
                    />
                  ))}
                </View>
              ))}
            </Motion.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </ScreenShell>
  )
}

const GRID = 6
const GRID_LINES: boolean[][] = Array.from({ length: GRID }, (_, r) =>
  Array.from({ length: GRID }, (_, c) => (r + c) % 2 === 0),
)

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  viewport: {
    width: VIEWPORT,
    height: VIEWPORT,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  canvas: {
    width: CANVAS,
    height: CANVAS,
    marginLeft: -(CANVAS - VIEWPORT) / 2,
    marginTop: -(CANVAS - VIEWPORT) / 2,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  cell: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#fff',
  },
  cellAccent: {
    flex: 1,
    backgroundColor: '#c7d2fe',
    borderWidth: 1,
    borderColor: '#fff',
  },
})
