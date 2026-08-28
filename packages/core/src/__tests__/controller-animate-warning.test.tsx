import { Motion } from '../motion'
import { renderWithMotion } from '../testing'
import { useVariants } from '../values/useVariants'
import { __resetWarnOnceForTests } from '../internal/warnOnce'

// The controller drives the animation when both `controller` and `animate`
// are set — `animate` is ignored. That precedence is documented, but before
// this warning it was silent, so a consumer who set both could watch
// `animate` do nothing and have no signal pointing at the cause.

const VARIANTS = {
  open: { opacity: 1 },
  closed: { opacity: 0 },
}

function Both() {
  const controller = useVariants(VARIANTS, 'closed')
  return (
    <Motion.View
      testID="subject"
      variants={VARIANTS}
      controller={controller}
      animate={{ opacity: 1 }}
    />
  )
}

function ControllerOnly() {
  const controller = useVariants(VARIANTS, 'closed')
  return (
    <Motion.View testID="subject" variants={VARIANTS} controller={controller} />
  )
}

describe('controller + animate — dev warning', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  it('warns once when both props are set', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = renderWithMotion(<Both />)
    result.rerender(<Both />)

    const messages = warn.mock.calls
      .map(([msg]) => String(msg))
      .filter((msg) => msg.includes('`controller` and `animate`'))
    expect(messages).toHaveLength(1)
  })

  it('does not warn for a controller without `animate`', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    renderWithMotion(<ControllerOnly />)

    const messages = warn.mock.calls
      .map(([msg]) => String(msg))
      .filter((msg) => msg.includes('`controller` and `animate`'))
    expect(messages).toHaveLength(0)
  })
})
