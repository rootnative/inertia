import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { Motion, useVariants } from '@onlynative/inertia'
import { ScreenShell } from './ScreenShell'

const cardVariants = {
  closed: { translateY: 100, opacity: 0, scale: 0.9 },
  peek: { translateY: 40, opacity: 0.6, scale: 0.95 },
  open: { translateY: 0, opacity: 1, scale: 1 },
} as const

export function VariantsScreen({ onBack }: { onBack: () => void }) {
  // String-keyed `animate` looked up against `variants`.
  const [state, setState] = useState<keyof typeof cardVariants>('closed')

  // Imperative controller path — same map, driven via `transitionTo`.
  const controller = useVariants(cardVariants, 'closed')
  const cycle = () => {
    const order = ['closed', 'peek', 'open'] as const
    const next =
      order[(order.indexOf(controller.current as never) + 1) % order.length]!
    controller.transitionTo(next)
  }

  return (
    <ScreenShell title="Variants" onBack={onBack}>
      <Motion.View
        variants={cardVariants}
        animate={state}
        transition={{ type: 'spring', tension: 180, friction: 16 }}
        style={styles.cardA}
      />
      <Motion.View
        variants={cardVariants}
        controller={controller}
        transition={{ type: 'spring', tension: 220, friction: 18 }}
        style={styles.cardB}
      />
      <Pressable
        onPress={() => setState((s) => nextState(s))}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>Cycle prop-driven</Text>
      </Pressable>
      <Pressable onPress={cycle} style={styles.button}>
        <Text style={styles.buttonLabel}>Cycle controller</Text>
      </Pressable>
    </ScreenShell>
  )
}

function nextState(s: keyof typeof cardVariants): keyof typeof cardVariants {
  if (s === 'closed') return 'peek'
  if (s === 'peek') return 'open'
  return 'closed'
}

const styles = StyleSheet.create({
  cardA: {
    width: 140,
    height: 80,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
  },
  cardB: {
    width: 140,
    height: 80,
    backgroundColor: '#10b981',
    borderRadius: 14,
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
