import { render } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { Motion } from '../motion'
import { renderWithMotion } from '../testing'

// Color animation is the gating capability for migrating `@rootnative/ui`'s
// state-layer components (Button / Card / Chip / etc.) onto Inertia. Reanimated
// 3+ recognizes color strings inside `withSpring` / `withTiming` natively, so
// the factory's job is to (a) seed the shared value with a string, (b) forward
// the target string through the resolver unchanged, and (c) read it back into
// the animated style untouched. These tests guard each link in that chain.

function getStyle(
  node: { props: { style?: unknown } } | null,
): Record<string, unknown> {
  if (!node) return {}
  const raw = node.props.style
  const flat = Array.isArray(raw) ? raw.flat(Infinity) : [raw]
  return Object.assign({}, ...flat.filter(Boolean))
}

const STYLE_TRANSPARENT_BORDER = { borderColor: 'transparent' } as const

describe('color animation', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('forwards the target backgroundColor through withSpring as a string', () => {
    const withSpring = jest.spyOn(Reanimated, 'withSpring')

    renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
        animate={{ backgroundColor: '#4f46e5' }}
        transition={{ type: 'spring' }}
      />,
    )

    expect(withSpring).toHaveBeenCalledWith(
      '#4f46e5',
      expect.any(Object),
      undefined,
    )
  })

  it('renders the post-effect backgroundColor in the animated style', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
        animate={{ backgroundColor: '#4f46e5' }}
        transition={{ type: 'spring' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.backgroundColor).toBe('#4f46e5')
  })

  it('supports borderColor and color alongside backgroundColor', () => {
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        }}
        animate={{
          backgroundColor: '#fff',
          borderColor: '#000',
        }}
        transition={{ type: 'timing', duration: 150 }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.backgroundColor).toBe('#fff')
    expect(style.borderColor).toBe('#000')
  })

  it('initial color is applied at mount (before the effect fires)', () => {
    // Plain `render` (via `renderWithMotion` without the post-effect re-render)
    // would show initial; `renderWithMotion` flushes one re-render so the
    // animated style reflects the target. Mount-state assertions are covered by
    // testing-helper.test.tsx with opacity; here we just confirm the seed
    // string flows through useSharedValue without being coerced to NaN or 0.
    const result = renderWithMotion(
      <Motion.View
        testID="seed"
        initial={{ backgroundColor: '#ff0000' }}
        animate={{ backgroundColor: '#ff0000' }}
        transition={{ type: 'no-animation' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.backgroundColor).toBe('#ff0000')
  })

  it('color keys not declared on animate stay out of the rendered style', () => {
    // Allocating shared values for every color key (so hook order is stable)
    // must not leak `backgroundColor: 'transparent'` into the final style on a
    // primitive that only animates opacity. The `activeKeysRef` filter is what
    // gates this; this test guards that gate.
    const result = renderWithMotion(
      <Motion.View
        testID="opacity-only"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring' }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style).not.toHaveProperty('backgroundColor')
    expect(style).not.toHaveProperty('borderColor')
    expect(style).not.toHaveProperty('color')
    expect(style).not.toHaveProperty('tintColor')
  })

  it('Motion.Image accepts tintColor in animate', () => {
    const result = renderWithMotion(
      <Motion.Image
        testID="img"
        source={{ uri: 'https://example.invalid/x.png' }}
        initial={{ tintColor: 'transparent' }}
        animate={{ tintColor: '#0a84ff' }}
        transition={{ type: 'timing', duration: 200 }}
      />,
    )

    const style = getStyle(result.toJSON() as never)
    expect(style.tintColor).toBe('#0a84ff')
  })
})

// `'transparent'` is the one CSS colour name Reanimated's `isColor` rejects
// (its colour table maps it to `undefined`), so a colour slot resting at the
// keyword cannot be animated away from — it takes the prefix-number-suffix
// branch and yields `NaN`. `reanimated-drivers.test.ts` proves that against the
// real driver; these tests pin Inertia's side of it, which is that the keyword
// never reaches a slot in the first place. Every route into one is covered.
describe("colour slots never hold the 'transparent' keyword", () => {
  it('rewrites it in the mount seed from `initial`', () => {
    // Plain `render`, not `renderWithMotion`: the seed is what the slot holds
    // before the effect assigns a target, so it is only visible at mount.
    const result = render(
      <Motion.View
        testID="card"
        initial={{ backgroundColor: 'transparent' }}
        animate={{ backgroundColor: '#4f46e5' }}
        transition={{ type: 'timing', duration: 150 }}
      />,
    )

    expect(getStyle(result.toJSON() as never).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    )
  })

  it('rewrites it in the resting default for an undriven active key', () => {
    // `borderColor` is in the active set only because a gesture sub-state
    // mentions it, and nothing declares it — so it rests at DEFAULT_RESTING.
    const result = render(
      <Motion.View
        testID="card"
        animate={{ opacity: 1 }}
        gesture={{ pressed: { borderColor: '#4f46e5' } }}
      />,
    )

    expect(getStyle(result.toJSON() as never).borderColor).toBe(
      'rgba(0, 0, 0, 0)',
    )
  })

  it('rewrites it when the static style is what the key rests at', () => {
    const result = render(
      <Motion.View
        testID="card"
        style={STYLE_TRANSPARENT_BORDER}
        animate={{ opacity: 1 }}
        gesture={{ pressed: { borderColor: '#4f46e5' } }}
      />,
    )

    expect(getStyle(result.toJSON() as never).borderColor).toBe(
      'rgba(0, 0, 0, 0)',
    )
  })

  it('rewrites it as a target, so a later animation can start from it', () => {
    // A target of `'transparent'` animates fine — Reanimated dispatches on the
    // *source*. It matters under `'no-animation'` (so under reduced motion),
    // where the target is assigned straight into the slot and becomes the next
    // animation's source.
    const result = renderWithMotion(
      <Motion.View
        testID="card"
        initial={{ backgroundColor: '#4f46e5' }}
        animate={{ backgroundColor: 'transparent' }}
        transition={{ type: 'no-animation' }}
      />,
    )

    expect(getStyle(result.toJSON() as never).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    )
  })

  it('rewrites it inside a keyframe sequence', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')

    renderWithMotion(
      <Motion.View
        testID="card"
        animate={{ backgroundColor: ['transparent', '#4f46e5'] }}
        transition={{ type: 'timing', duration: 100 }}
      />,
    )

    const targets = withTiming.mock.calls.map(([value]) => value)
    expect(targets).toContain('rgba(0, 0, 0, 0)')
    expect(targets).not.toContain('transparent')
  })
})
