import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

type Card = {
  id: string
  title: string
  subtitle: string
  color: string
  // Deliberately different from `color` so the style carry has something to
  // cross-fade. The grid tile and the detail header are the same logical
  // element wearing two different shades.
  detailColor: string
}

const CARDS: ReadonlyArray<Card> = [
  {
    id: 'horizon',
    title: 'Horizon',
    subtitle: 'Dawn light over the bay',
    color: '#f97316',
    detailColor: '#b45309',
  },
  {
    id: 'cobalt',
    title: 'Cobalt',
    subtitle: 'Deep blue tides',
    color: '#2563eb',
    detailColor: '#1e3a8a',
  },
  {
    id: 'mint',
    title: 'Mint',
    subtitle: 'A walk through the orchard',
    color: '#10b981',
    detailColor: '#065f46',
  },
]

// Demonstrates `layoutId`: a small card in the grid and a large detail
// view share the same id, so toggling between them FLIPs the rect from
// the source position to the target — a Hero-style transition without
// any explicit animation config beyond the shared id.
//
// What to look for:
//   - Tap a card → the small tile visually grows into the detail view, and its
//     background colour and corner radius cross-fade on the way rather than
//     snapping the moment the detail view mounts. Each card's detail shade is
//     deliberately darker than its tile so the carry is visible.
//   - Tap "Back" → the detail view shrinks back into the matching tile, and the
//     colour travels back with it.
//   - Toggle reduced motion in the OS settings; the transition snaps.
//   - Turn on "offset the detail container" and repeat. That nests the detail
//     view inside a padded container, so source and target sit under parents at
//     different window offsets — the case parent-relative coordinates got wrong
//     and window coordinates fix. On Fabric the transition should stay glued to
//     the tile; if it lands short by the container's offset, window measurement
//     isn't happening and the fallback is in play.
export function SharedElementScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<Card | null>(null)
  const [offsetParent, setOffsetParent] = useState(false)

  return (
    <ScreenShell
      title="Shared element transition (layoutId)"
      description="Two Motion.Views with the same layoutId animate from the source rect to the target rect. The grid card and the detail header are the same logical element."
      onBack={onBack}
    >
      <Pressable
        onPress={() => setOffsetParent((v) => !v)}
        style={styles.toggle}
      >
        <Text style={styles.toggleLabel}>
          {offsetParent
            ? '✓ Detail sits in an offset container'
            : 'Offset the detail container'}
        </Text>
      </Pressable>

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
          {/* When toggled, an extra padded container puts the target under a
              parent at a different window offset from the grid's. */}
          <View style={offsetParent ? styles.offsetParent : undefined}>
            <Motion.View
              layoutId={`card-${selected.id}`}
              style={[styles.detail, cardColor(selected.detailColor)]}
              transition={{ type: 'spring', tension: 220, friction: 24 }}
            >
              <Text style={styles.detailTitle}>{selected.title}</Text>
              <Text style={styles.detailSubtitle}>{selected.subtitle}</Text>
            </Motion.View>
          </View>
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
          Rects are measured in window coordinates where the host supports it
          synchronously (Fabric), so source and target may sit under differently
          positioned parents. Where it does not (the legacy architecture), both
          fall back to parent-relative coordinates — consistent, but blind to
          the parents&apos; own offsets. A source and target that end up in
          different coordinate spaces skip the animation rather than play a
          wrong one.
        </Text>
        <Text style={styles.noteBody}>
          A still-mounted source is re-measured at the moment the target lays
          out, so scrolling this list before tapping does not offset the
          transition. Once the source has unmounted, its last recorded rect is
          all that is left.
        </Text>
        <Text style={styles.noteBody}>
          Alongside the rect, a fixed set of style keys is carried from the
          source and cross-faded out: opacity, borderRadius, backgroundColor,
          borderColor, color, and tintColor. Transform keys are not — the FLIP
          already owns them. A key only participates when the element has a
          value for it, so nothing is invented for a key you never set.
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
  offsetParent: {
    paddingTop: 80,
    paddingLeft: 40,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
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
