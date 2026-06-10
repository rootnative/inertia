import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { Motion } from '@rootnative/inertia'
import { useDrag } from '@rootnative/inertia-gestures'
import { ScreenShell } from './ScreenShell'

type Mode = 'free' | 'x-only' | 'clamped' | 'rubber-band'

export function DragScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('free')

  return (
    <ScreenShell
      title="Drag"
      description="useDrag from the gestures adapter. Pick a mode to see free, axis-locked, hard-clamped, or rubber-banded drag."
      onBack={onBack}
      fill
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.modes}>
          <ModeButton
            label="Free"
            active={mode === 'free'}
            onPress={() => setMode('free')}
          />
          <ModeButton
            label="X-only"
            active={mode === 'x-only'}
            onPress={() => setMode('x-only')}
          />
          <ModeButton
            label="Clamped ±100"
            active={mode === 'clamped'}
            onPress={() => setMode('clamped')}
          />
          <ModeButton
            label="Rubber-band"
            active={mode === 'rubber-band'}
            onPress={() => setMode('rubber-band')}
          />
        </View>
        <View style={styles.stage}>
          <DragBox key={mode} mode={mode} />
        </View>
        <Text style={styles.hint}>{HINTS[mode]}</Text>
      </GestureHandlerRootView>
    </ScreenShell>
  )
}

const HINTS: Record<Mode, string> = {
  free: 'Two-axis drag, no bounds.',
  'x-only': 'Drag horizontally — y is ignored.',
  clamped: 'Hard clamp to ±100 px on x, ±60 px on y.',
  'rubber-band': '±100/±60 px with elastic 0.4 — overshoot is dampened.',
}

function DragBox({ mode }: { mode: Mode }) {
  const drag = useDrag(OPTIONS_FOR[mode])
  const styleStack = [styles.box, drag.animatedStyle]
  return (
    <GestureDetector gesture={drag.gesture}>
      <Motion.View style={styleStack} />
    </GestureDetector>
  )
}

const OPTIONS_FOR = {
  free: {},
  'x-only': { axis: 'x' as const },
  clamped: {
    constraints: { left: -100, right: 100, top: -60, bottom: 60 },
  },
  'rubber-band': {
    constraints: { left: -100, right: 100, top: -60, bottom: 60 },
    elastic: 0.4,
  },
}

function ModeButton({
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
      style={active ? styles.modeButtonActive : styles.modeButton}
    >
      <Text style={active ? styles.modeLabelActive : styles.modeLabel}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  modeButtonActive: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 999,
  },
  modeLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  modeLabelActive: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
  stage: {
    width: 280,
    height: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  box: {
    width: 80,
    height: 80,
    backgroundColor: '#4f46e5',
    borderRadius: 16,
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
})
