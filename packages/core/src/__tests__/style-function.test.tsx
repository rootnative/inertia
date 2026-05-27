import { render } from '@testing-library/react-native'
import { Motion } from '../motion'

// `style={(state) => ...}` is the Pressable render-prop API. Inertia owns
// press/focus state via the `gesture` prop, so a function passed via `style`
// is silently swallowed by the underlying component (it sits inside a style
// array that the consumer never unwraps). We throw in dev rather than ship
// the footgun — consumers should reach for `gesture.pressed` instead.

describe('style function-form is rejected in dev', () => {
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('Motion.View throws when style is a function', () => {
    expect(() =>
      render(
        <Motion.View
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={(() => ({ opacity: 0.5 })) as any}
        />,
      ),
    ).toThrow(/style.*function/i)
  })

  it('Motion.Pressable throws when style is a function', () => {
    expect(() =>
      render(
        <Motion.Pressable
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={
            ((state: { pressed: boolean }) => ({
              opacity: state.pressed ? 0.5 : 1,
            })) as any
          }
        />,
      ),
    ).toThrow(/gesture\.pressed/)
  })

  it('object-form style still works', () => {
    const stableStyle = { opacity: 1 }
    expect(() => render(<Motion.View style={stableStyle} />)).not.toThrow()
  })

  it('array-form style still works', () => {
    const a = { opacity: 1 }
    const b = { transform: [{ scale: 1 }] }
    expect(() => render(<Motion.View style={[a, b]} />)).not.toThrow()
  })
})
