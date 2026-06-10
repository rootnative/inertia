import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

type Card = { id: string; title: string; subtitle: string; color: string }

const CARDS: ReadonlyArray<Card> = [
  {
    id: 'horizon',
    title: 'Horizon',
    subtitle: 'Dawn light over the bay',
    color: '#f97316',
  },
  {
    id: 'cobalt',
    title: 'Cobalt',
    subtitle: 'Deep blue tides',
    color: '#2563eb',
  },
  {
    id: 'mint',
    title: 'Mint',
    subtitle: 'A walk through the orchard',
    color: '#10b981',
  },
]

// Demonstrates `layoutId`: a small card in the grid and a large detail
// view share the same id, so toggling between them FLIPs the rect from
// the source position to the target — a Hero-style transition without
// any explicit animation config beyond the shared id.
//
// What to look for:
//   - Tap a card → the small tile visually grows into the detail view.
//   - Tap "Back" → the detail view shrinks back into the matching tile.
//   - Toggle reduced motion in the OS settings; the transition snaps.
export function SharedElementScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<Card | null>(null)

  return (
    <ScreenShell
      title="Shared element transition (layoutId)"
      description="Two Motion.Views with the same layoutId animate from the source rect to the target rect. The grid card and the detail header are the same logical element."
      onBack={onBack}
    >
      {selected === null ? (
        <View style={styles.grid}>
          {CARDS.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => setSelected(card)}
              style={styles.cardPressable}
            >
              <Motion.View
                layoutId={`card-${card.id}`}
                style={[styles.card, cardColor(card.color)]}
                transition={{
                  type: 'spring',
                  tension: 220,
                  friction: 24,
                }}
              >
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
              </Motion.View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.detailWrap}>
          <Motion.View
            layoutId={`card-${selected.id}`}
            style={[styles.detail, cardColor(selected.color)]}
            transition={{ type: 'spring', tension: 220, friction: 24 }}
          >
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <Text style={styles.detailSubtitle}>{selected.subtitle}</Text>
          </Motion.View>
          <Pressable
            onPress={() => setSelected(null)}
            style={styles.backButton}
          >
            <Text style={styles.backLabel}>Back to grid</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Caveats</Text>
        <Text style={styles.noteBody}>
          v1 uses parent-relative coordinates from onLayout. For navigators
          where source and target share an outer container (most stack
          navigators), the FLIP delta matches what the user perceives.
          Nested-parent setups with different offsets will be off by the offset.
        </Text>
        <Text style={styles.noteBody}>
          Only the rect is animated. Border radius, colors, and other style
          props snap. Style-prop interpolation lands in v2.
        </Text>
      </View>
    </ScreenShell>
  )
}

function cardColor(backgroundColor: string) {
  // Inline-style ban: extract per-instance color into a stable shape so
  // the StyleSheet entries stay reusable.
  return { backgroundColor }
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: 320,
  },
  cardPressable: {
    width: 150,
  },
  card: {
    height: 110,
    borderRadius: 14,
    padding: 14,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  detailWrap: {
    width: 320,
    gap: 16,
  },
  detail: {
    height: 240,
    borderRadius: 18,
    padding: 20,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    color: 'white',
    fontWeight: '800',
    fontSize: 28,
  },
  detailSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 4,
  },
  backButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  backLabel: {
    color: 'white',
    fontWeight: '600',
  },
  note: {
    width: 320,
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
