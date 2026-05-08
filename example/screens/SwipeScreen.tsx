import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import { Motion } from '@onlynative/inertia'
import { useSwipe, type SwipeDirection } from '@onlynative/inertia-gestures'
import { ScreenShell } from './ScreenShell'

interface Card {
  id: string
  title: string
  color: string
}

const INITIAL_CARDS: Card[] = [
  { id: 'a', title: 'Card A', color: '#ef4444' },
  { id: 'b', title: 'Card B', color: '#f97316' },
  { id: 'c', title: 'Card C', color: '#eab308' },
  { id: 'd', title: 'Card D', color: '#22c55e' },
  { id: 'e', title: 'Card E', color: '#3b82f6' },
]

export function SwipeScreen({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState(INITIAL_CARDS)
  const [lastAction, setLastAction] = useState<string>('—')

  const reset = () => {
    setCards(INITIAL_CARDS)
    setLastAction('—')
  }

  const handleSwipe = (direction: SwipeDirection) => {
    const top = cards[cards.length - 1]
    if (!top) return
    setLastAction(`${direction === 'right' ? 'Liked' : 'Skipped'} ${top.title}`)
    setCards((prev) => prev.slice(0, -1))
  }

  return (
    <ScreenShell title="Swipe (card stack)" onBack={onBack}>
      <GestureHandlerRootView style={styles.root}>
        <Text style={styles.hint}>
          Swipe the top card left to skip or right to like.
        </Text>
        <View style={styles.stage}>
          {cards.length === 0 ? (
            <Text style={styles.empty}>No cards left</Text>
          ) : (
            cards.map((card, i) => {
              const isTop = i === cards.length - 1
              const offset = (cards.length - 1 - i) * 8
              return (
                <CardView
                  key={card.id}
                  card={card}
                  offset={offset}
                  isTop={isTop}
                  onSwipe={handleSwipe}
                />
              )
            })
          )}
        </View>
        <Text style={styles.action}>Last action: {lastAction}</Text>
        <Pressable onPress={reset} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Reset</Text>
        </Pressable>
      </GestureHandlerRootView>
    </ScreenShell>
  )
}

function CardView({
  card,
  offset,
  isTop,
  onSwipe,
}: {
  card: Card
  offset: number
  isTop: boolean
  onSwipe: (direction: SwipeDirection) => void
}) {
  const swipe = useSwipe({
    directions: ['left', 'right'],
    distanceThreshold: 100,
    onSwipe: (direction) => onSwipe(direction),
  })

  const cardStyle = [
    styles.card,
    {
      backgroundColor: card.color,
      top: offset,
      transform: [{ translateY: -offset }],
    },
    isTop ? swipe.animatedStyle : null,
  ]

  if (!isTop) {
    return (
      <View style={cardStyle}>
        <Text style={styles.cardLabel}>{card.title}</Text>
      </View>
    )
  }

  return (
    <GestureDetector gesture={swipe.gesture}>
      <Motion.View style={cardStyle}>
        <Text style={styles.cardLabel}>{card.title}</Text>
      </Motion.View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  stage: {
    width: 240,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: 220,
    height: 300,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardLabel: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
  empty: {
    fontSize: 16,
    color: '#9ca3af',
  },
  action: {
    fontSize: 14,
    color: '#374151',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4f46e5',
    borderRadius: 999,
  },
  resetLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})
