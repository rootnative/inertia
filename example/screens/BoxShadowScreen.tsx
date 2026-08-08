import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * `boxShadow` on the declarative surface — the cross-platform CSS shadow form,
 * as opposed to the native `shadow*` keys `ShadowScreen` covers.
 *
 * Three things are worth watching on a device:
 *
 *  1. **Layer counts don't have to match.** The elevation card animates between
 *     a one-layer and a two-layer shadow; the short side is padded with a
 *     transparent layer, so the extra layer fades rather than popping.
 *  2. **Both input forms work.** The token card animates CSS strings (what a
 *     design system stores); the structured card animates RN's
 *     `BoxShadowValue[]` with numeric fields.
 *  3. **Springs on a shadow.** The blur/offset/spread of every layer springs
 *     independently, which reads differently from a timing curve — this is the
 *     part that needs eyes on real hardware, not a test.
 */
export function BoxShadowScreen({ onBack }: { onBack: () => void }) {
  const [raised, setRaised] = useState(false)

  return (
    <ScreenShell
      title="boxShadow"
      description="Animate the CSS boxShadow form — multi-layer, cross-platform, layer counts free to differ between endpoints. Tap to toggle."
      onBack={onBack}
      fill
    >
      <View style={styles.stage}>
        <Pressable onPress={() => setRaised((v) => !v)} style={styles.toggle}>
          <Text style={styles.toggleLabel}>
            {raised ? 'Lower all' : 'Raise all'}
          </Text>
        </Pressable>

        <Text style={styles.label}>CSS token · 1 layer ⇄ 2 layers</Text>
        <Motion.View
          style={styles.card}
          initial={{ boxShadow: FLAT }}
          animate={{ boxShadow: raised ? RAISED : FLAT }}
          transition={{ type: 'spring', tension: 160, friction: 18 }}
        />

        <Text style={styles.label}>Structured form · timing</Text>
        <Motion.View
          style={styles.card}
          initial={{ boxShadow: STRUCTURED_FLAT }}
          animate={{ boxShadow: raised ? STRUCTURED_RAISED : STRUCTURED_FLAT }}
          transition={{ type: 'timing', duration: 220 }}
        />

        <Text style={styles.label}>Inset · deep ⇄ shallow</Text>
        <Motion.View
          style={styles.card}
          initial={{ boxShadow: INSET_DEEP }}
          animate={{ boxShadow: raised ? INSET_SHALLOW : INSET_DEEP }}
          transition={{ type: 'timing', duration: 220 }}
        />

        <Text style={styles.note}>
          `inset` is carried as a static per-layer flag, not interpolated — both
          endpoints above are inset, so the flag holds while blur and offset
          animate. Mixing an inset endpoint with a non-inset one throws: there
          is no meaningful midpoint between an inner and an outer shadow. On
          Android, check this card renders at all — inset support is thinner
          there than on iOS.
        </Text>
      </View>
    </ScreenShell>
  )
}

// CSS-string endpoints, the shape a design system stores its elevation tokens
// in. One layer at rest, two when raised — deliberately mismatched to exercise
// the padding path.
const FLAT = '0px 1px 2px rgba(0, 0, 0, 0.25)'
const RAISED =
  '0px 6px 14px rgba(0, 0, 0, 0.28), 0px 2px 4px 1px rgba(0, 0, 0, 0.15)'

// RN's own array form — the other accepted input shape. Both endpoints are one
// layer here on purpose: the CSS card above covers the mismatched-count path,
// so this card isolates the structured parse and the `spreadDistance` field.
const STRUCTURED_FLAT = [
  { offsetX: 0, offsetY: 1, blurRadius: 3, color: 'rgba(0, 0, 0, 0.3)' },
]
const STRUCTURED_RAISED = [
  {
    offsetX: 0,
    offsetY: 8,
    blurRadius: 16,
    spreadDistance: 2,
    color: 'rgba(79, 70, 229, 0.45)',
  },
]

// Deliberately exaggerated. Android's `boxShadow` inset support is weaker than
// iOS's, so the question this card answers is "does inset draw on Android at
// all" — a subtle delta can't tell an unsupported key from one that moved too
// little to see. A near-black 20px inset on a white card is unmistakable.
const INSET_DEEP = 'inset 0px 14px 20px 4px rgba(0, 0, 0, 0.55)'
const INSET_SHALLOW = 'inset 0px 2px 4px rgba(0, 0, 0, 0.12)'

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  toggle: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  toggleLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    width: 240,
    height: 84,
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    paddingHorizontal: 8,
    marginTop: 8,
  },
})
