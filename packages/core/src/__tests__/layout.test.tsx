import { render } from '@testing-library/react-native'
import { Motion } from '../motion'
import { resolveLayoutTransition } from '../layout'
import { DEFAULT_SPRING } from '../transitions/spring'

describe('resolveLayoutTransition', () => {
  it('returns undefined when the prop is omitted, false, or no-animation', () => {
    expect(resolveLayoutTransition(undefined)).toBeUndefined()
    expect(resolveLayoutTransition(false)).toBeUndefined()
    expect(resolveLayoutTransition({ type: 'no-animation' })).toBeUndefined()
  })

  it('layout={true} produces a default spring builder', () => {
    const t = resolveLayoutTransition(true) as unknown as Record<
      string,
      unknown
    >
    expect(t.__mode).toBe('spring')
    expect(t.stiffness).toBe(DEFAULT_SPRING.tension)
    expect(t.damping).toBe(DEFAULT_SPRING.friction)
    expect(t.mass).toBe(DEFAULT_SPRING.mass)
  })

  it('spring config bridges tension/friction/mass to stiffness/damping/mass', () => {
    const t = resolveLayoutTransition({
      type: 'spring',
      tension: 240,
      friction: 18,
      mass: 1.4,
      delay: 50,
    }) as unknown as Record<string, unknown>
    expect(t.__mode).toBe('spring')
    expect(t.stiffness).toBe(240)
    expect(t.damping).toBe(18)
    expect(t.mass).toBe(1.4)
    expect(t.delay).toBe(50)
  })

  it('partial spring config fills missing fields from the library default', () => {
    const t = resolveLayoutTransition({
      type: 'spring',
      tension: 320,
    }) as unknown as Record<string, unknown>
    expect(t.stiffness).toBe(320)
    expect(t.damping).toBe(DEFAULT_SPRING.friction)
    expect(t.mass).toBe(DEFAULT_SPRING.mass)
  })

  it('timing config maps to duration + easing', () => {
    const easing = (x: number) => x * x
    const t = resolveLayoutTransition({
      type: 'timing',
      duration: 420,
      easing,
      delay: 16,
    }) as unknown as Record<string, unknown>
    expect(t.__mode).toBe('timing')
    expect(t.__duration).toBe(420)
    expect(typeof t.easing).toBe('function')
    expect(t.delay).toBe(16)
  })

  it('timing defaults to 300ms when no duration is given', () => {
    const t = resolveLayoutTransition({
      type: 'timing',
    }) as unknown as Record<string, unknown>
    expect(t.__duration).toBe(300)
  })

  it('decay silently downgrades to spring', () => {
    const t = resolveLayoutTransition({
      type: 'decay',
      velocity: 200,
    }) as unknown as Record<string, unknown>
    expect(t.__mode).toBe('spring')
    expect(t.stiffness).toBe(DEFAULT_SPRING.tension)
  })
})

describe('Motion.View layout prop', () => {
  it('renders without crashing when layout is passed', () => {
    const { toJSON } = render(<Motion.View layout />)
    expect(toJSON()).toBeTruthy()
  })

  it('renders without crashing when layout has a typed transition', () => {
    const { toJSON } = render(
      <Motion.View layout={{ type: 'spring', tension: 200 }} />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it('renders without crashing when layout is false', () => {
    const { toJSON } = render(<Motion.View layout={false} />)
    expect(toJSON()).toBeTruthy()
  })
})
