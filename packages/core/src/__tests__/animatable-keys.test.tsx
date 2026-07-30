/**
 * Runtime half of the `0.0.5` animatable-key contract. The type half lives in
 * `__type-tests__/animate-keys.test-d.tsx`; this file asserts that every key
 * the type accepts is actually driven — i.e. reaches the rendered style.
 *
 * Why both halves are needed: a key present in `AnimatableStyleKey` but missing
 * from `ALL_KEYS` typechecks perfectly and then does nothing at runtime, which
 * is the exact defect `0.0.5` fixed (`paddingTop`, `fontSize`, `top`, and ~35
 * others all compiled and were silently dropped before this release). tsc can
 * only see the first half of that; only a render can see the second.
 *
 * The Reanimated mock resolves animations synchronously, so asserting on the
 * final flattened style is the sanctioned check here — see the testing notes in
 * `CLAUDE.md`. Frame-level behavior is validated in the example app.
 *
 * Everything renders through `renderWithMotion` rather than a bare `render`.
 * The mock is static-render: the first pass captures the style at the *seed*
 * shared-value snapshot, before the animation effect writes the target. A bare
 * `render` therefore reports `initial` (or a sequence's first keyframe), not the
 * settled value — which for a single-value `animate` on a fresh element happens
 * to coincide, but for `initial` + `animate` or a keyframe array does not.
 */

import * as React from 'react'
import { StyleSheet } from 'react-native'
import { Motion } from '../index'
import { renderWithMotion } from '../testing'

/**
 * Flatten the rendered style of a `Motion.*` host into one object. The animated
 * style is the last entry (it merges after the static `style`), and RN hands
 * back an array with a leading `null` when no static style is supplied.
 */
function flatStyleOf(el: {
  props: { style?: unknown }
}): Record<string, unknown> {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>
}

describe('animatable keys — every accepted key is driven', () => {
  // One case per key group, mirroring the type-test's grouping. Each entry is
  // [label, animate target]; the assertion is that every key in the target
  // survives into the rendered style with the value it was given.
  const VIEW_CASES: Array<[string, Record<string, number>]> = [
    [
      'per-corner radii',
      {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 10,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 6,
      },
    ],
    [
      'border widths',
      {
        borderWidth: 2,
        borderTopWidth: 1,
        borderRightWidth: 3,
        borderBottomWidth: 4,
        borderLeftWidth: 5,
      },
    ],
    ['absolute insets', { top: 10, right: 20, bottom: 30, left: 40 }],
    [
      'padding',
      {
        padding: 8,
        paddingTop: 4,
        paddingRight: 5,
        paddingBottom: 6,
        paddingLeft: 7,
        paddingHorizontal: 9,
        paddingVertical: 11,
      },
    ],
    [
      'margin',
      {
        margin: 8,
        marginTop: 4,
        marginRight: 5,
        marginBottom: 6,
        marginLeft: 7,
        marginHorizontal: 9,
        marginVertical: 11,
      },
    ],
    ['flex sizing', { flex: 1, flexGrow: 2, flexShrink: 0 }],
    ['stacking', { zIndex: 3 }],
    ['gaps', { gap: 8, rowGap: 4, columnGap: 6 }],
  ]

  it.each(VIEW_CASES)('drives %s on Motion.View', (_label, target) => {
    const { getByTestId } = renderWithMotion(
      <Motion.View testID="v" animate={target} />,
    )
    const flat = flatStyleOf(getByTestId('v'))
    for (const [key, value] of Object.entries(target)) {
      expect(flat[key]).toBe(value)
    }
  })

  it('drives text metrics on Motion.Text', () => {
    const target = { fontSize: 20, letterSpacing: 1.5, lineHeight: 28 }
    const { getByTestId } = renderWithMotion(
      <Motion.Text testID="t" animate={target} />,
    )
    const flat = flatStyleOf(getByTestId('t'))
    expect(flat.fontSize).toBe(20)
    expect(flat.letterSpacing).toBe(1.5)
    expect(flat.lineHeight).toBe(28)
  })

  it('drives every new key in one animate target at once', () => {
    // The per-group cases above each activate a handful of keys; this one
    // activates all of them together, which is what exercises the worklet's
    // active-key loop at full width and would catch a key that only works in
    // isolation.
    const target = Object.assign({}, ...VIEW_CASES.map(([, t]) => t)) as Record<
      string,
      number
    >
    const { getByTestId } = renderWithMotion(
      <Motion.View testID="v" animate={target} />,
    )
    const flat = flatStyleOf(getByTestId('v'))
    for (const [key, value] of Object.entries(target)) {
      expect(flat[key]).toBe(value)
    }
  })
})

describe('animatable keys — resting behavior (the 0.0.3 P0 class)', () => {
  // A key declared only in `gesture` / `exit` / a non-active variant joins the
  // active set, so the worklet emits it every frame — including at rest. If it
  // rested at DEFAULT_RESTING (0 for all the new keys) it would stomp the
  // static style, because the animated style merges *after* `style`. These are
  // the new keys' version of `style-resting.test.tsx`.

  it('a gesture-only key rests at the static style value', () => {
    const style = { paddingTop: 12, borderWidth: 2, top: 5 }
    const { getByTestId } = renderWithMotion(
      <Motion.View
        testID="v"
        style={style}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { paddingTop: 20, borderWidth: 4, top: 9 } }}
      />,
    )
    const flat = flatStyleOf(getByTestId('v'))
    expect(flat.paddingTop).toBe(12)
    expect(flat.borderWidth).toBe(2)
    expect(flat.top).toBe(5)
  })

  it('an exit-only key rests at the static style value', () => {
    const style = { marginTop: 16, gap: 6 }
    const { getByTestId } = renderWithMotion(
      <Motion.View
        testID="v"
        style={style}
        animate={{ opacity: 1 }}
        exit={{ marginTop: 0, gap: 0 }}
      />,
    )
    const flat = flatStyleOf(getByTestId('v'))
    expect(flat.marginTop).toBe(16)
    expect(flat.gap).toBe(6)
  })

  it('a non-active variant key rests at the static style value', () => {
    const style = { paddingHorizontal: 24, borderBottomWidth: 3 }
    const variants = {
      closed: { paddingHorizontal: 24, borderBottomWidth: 3 },
      open: { paddingHorizontal: 48, borderBottomWidth: 1 },
    }
    const { getByTestId } = renderWithMotion(
      <Motion.View
        testID="v"
        style={style}
        variants={variants}
        animate="closed"
      />,
    )
    const flat = flatStyleOf(getByTestId('v'))
    expect(flat.paddingHorizontal).toBe(24)
    expect(flat.borderBottomWidth).toBe(3)
  })

  it('falls back to the type default when the style is silent', () => {
    // No static style declares `paddingTop`, so the gesture-only key has
    // nothing to rest at and takes DEFAULT_RESTING's 0 — which is RN's own
    // unset value for it, so the element renders where it already was.
    const { getByTestId } = renderWithMotion(
      <Motion.View
        testID="v"
        animate={{ opacity: 1 }}
        gesture={{ pressed: { paddingTop: 20 } }}
      />,
    )
    expect(flatStyleOf(getByTestId('v')).paddingTop).toBe(0)
  })
})

describe('animatable keys — sequences and initial', () => {
  it('runs a sequence on a new key', () => {
    const { getByTestId } = renderWithMotion(
      <Motion.View testID="v" animate={{ paddingTop: [0, 20, 10] }} />,
    )
    // The mock resolves synchronously to the final step.
    expect(flatStyleOf(getByTestId('v')).paddingTop).toBe(10)
  })

  it('animates a new key from `initial`', () => {
    const { getByTestId } = renderWithMotion(
      <Motion.View testID="v" initial={{ top: 100 }} animate={{ top: 0 }} />,
    )
    expect(flatStyleOf(getByTestId('v')).top).toBe(0)
  })

  it('honours a per-property transition on a new key', () => {
    const transition = {
      paddingTop: { type: 'timing' as const, duration: 100 },
    }
    const { getByTestId } = renderWithMotion(
      <Motion.View
        testID="v"
        animate={{ paddingTop: 32 }}
        transition={transition}
      />,
    )
    expect(flatStyleOf(getByTestId('v')).paddingTop).toBe(32)
  })
})
