import { StyleSheet, Text, View } from 'react-native'
import { Motion } from '@rootnative/inertia'
import { ScreenShell } from './ScreenShell'

/**
 * MD3 elevation cascade demo. Two cards animate the full shadow surface in
 * one `Motion.Pressable` — `shadowOpacity` / `shadowRadius` / `shadowColor` /
 * `elevation` ride the existing numeric & color paths, and `shadowOffset`
 * (the one nested-object style) decomposes into two synthetic axis SVs that
 * the worklet recomposes into a `{ width, height }` style prop each frame.
 *
 * Press raises the card to MD3 level 3 on every platform; hover adds an
 * intermediate level 2 lift on web. Press must be the raise, not a settle
 * back to rest — there is no hover on a touch device, so a settle-shaped
 * cascade leaves `pressed` value-identical to rest and the demo renders no
 * motion at all on iOS and Android. `elevation` is Android-only; the four
 * `shadow*` keys are what iOS draws.
 */
export function ShadowScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenShell
      title="Shadow & elevation"
      description="Animate shadowOpacity / shadowRadius / shadowOffset / shadowColor / elevation together. Hover or press to raise the card."
      onBack={onBack}
      fill
    >
      <View style={styles.stage}>
        <Motion.Pressable
          style={styles.card}
          initial={REST_SHADOW}
          animate={REST_SHADOW}
          gesture={{ hovered: HOVERED_SHADOW, pressed: PRESSED_SHADOW }}
          transition={{ type: 'timing', duration: 180 }}
        >
          <Text style={styles.cardTitle}>Elevated card</Text>
          <Text style={styles.cardBody}>
            Hover lifts to MD3 level 3. Press settles back to level 1.
          </Text>
        </Motion.Pressable>

        <Text style={styles.label}>shadowOffset only</Text>
        <Motion.View
          style={styles.smallCard}
          initial={{ shadowOffset: { width: 0, height: 0 } }}
          animate={{ shadowOffset: { width: 0, height: 8 } }}
          transition={{
            shadowOffset: { type: 'spring', tension: 120, friction: 14 },
          }}
        />
      </View>
    </ScreenShell>
  )
}

// MD3 elevation token values (light theme, approximated).
const REST_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.15,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
}

// Level 2 — web-only intermediate lift. Sits between rest and pressed so the
// hover and press states stay visually distinct where both exist.
const HOVERED_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.19,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
}

// Level 3 — the raise. Every value differs from REST_SHADOW, which is what
// makes the demo move on a touch device.
const PRESSED_SHADOW = {
  shadowColor: '#1d4ed8',
  shadowOpacity: 0.34,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    gap: 32,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  card: {
    width: 260,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardBody: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  smallCard: {
    width: 80,
    height: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
})
