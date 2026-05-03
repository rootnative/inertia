import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

type LastEvent = {
  key: string
  phase: 'step' | 'sequence' | 'repeat' | 'animation'
  step: number | undefined
  iteration: number
}

export function SequenceScreen({ onBack }: { onBack: () => void }) {
  const [run, setRun] = useState(0)
  const [last, setLast] = useState<LastEvent | null>(null)

  return (
    <ScreenShell title="Sequences + repeat" onBack={onBack}>
      <Motion.View
        // Re-key on press to retrigger the sequence from its first frame.
        key={run}
        animate={{
          translateX: [0, 100, -100, 0],
          opacity: [0.4, { to: 1, type: 'timing', duration: 200 }, 0.4],
        }}
        transition={{
          translateX: { type: 'spring', tension: 200, friction: 14 },
          repeat: { count: 2, alternate: false },
        }}
        onAnimationEnd={({ key, phase, step, iteration }) => {
          setLast({ key: String(key), phase, step, iteration })
        }}
        style={styles.box}
      />
      <Text style={styles.event}>
        {last
          ? `${last.key}: phase=${last.phase} step=${last.step ?? '—'} iteration=${last.iteration}`
          : 'onAnimationEnd: waiting…'}
      </Text>
      <Pressable
        onPress={() => {
          setLast(null)
          setRun((n) => n + 1)
        }}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Replay sequence</Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  box: {
    width: 80,
    height: 80,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
  },
  event: {
    fontSize: 13,
    color: '#374151',
    fontVariant: ['tabular-nums'],
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
