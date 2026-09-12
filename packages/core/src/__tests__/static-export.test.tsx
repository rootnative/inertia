import { type ComponentProps } from 'react'
import { Platform, View } from 'react-native'
import { render } from '@testing-library/react-native'
import { Motion } from '../motion'
import {
  ENTRANCE_ATTRIBUTE,
  READY_ATTRIBUTE,
  entranceGuardCss,
  entranceGuardNoscriptCss,
} from '../staticExport'
import { __resetInertiaReadyForTests } from '../staticExport/ready'

const NATIVE_OS = Platform.OS

function setPlatform(os: string): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
}

afterEach(() => {
  setPlatform(NATIVE_OS)
})

describe('entranceGuardCss', () => {
  it('gates the fallback on the ready attribute, not on time alone', () => {
    const css = entranceGuardCss()

    // Without this selector the fallback would fire on a page whose animation
    // ran perfectly, revealing everything still deliberately hidden.
    expect(css).toContain(`html:not([${READY_ATTRIBUTE}])`)
    expect(css).toContain(`[${ENTRANCE_ATTRIBUTE}]`)
  })

  it('defaults to a 4 second wait and reveals to the resting state', () => {
    const css = entranceGuardCss()

    expect(css).toContain('4000ms')
    expect(css).toContain('opacity: 1')
    expect(css).toContain('transform: none')
  })

  it('takes a custom timeout', () => {
    expect(entranceGuardCss({ timeoutMs: 1500 })).toContain('1500ms')
    expect(entranceGuardCss({ timeoutMs: 1500 })).not.toContain('4000ms')
  })

  it('marks the noscript rules important, because the export writes inline styles', () => {
    expect(entranceGuardNoscriptCss).toContain('opacity: 1 !important')
    expect(entranceGuardNoscriptCss).toContain('transform: none !important')
    expect(entranceGuardNoscriptCss).toContain(`[${ENTRANCE_ATTRIBUTE}]`)
  })

  it('names the same attribute the primitives write', () => {
    // The whole point of shipping both halves from one package: the marker and
    // the rule that reveals it cannot drift apart. This test is that promise.
    setPlatform('web')
    const { getByTestId } = render(
      <Motion.View
        testID="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />,
    )
    const key = Object.keys(getByTestId('card').props.dataSet)[0]

    expect(ENTRANCE_ATTRIBUTE).toBe(`data-${key}`)
    expect(entranceGuardCss()).toContain(`[data-${key}]`)
  })
})

describe('the entrance marker on web', () => {
  beforeEach(() => setPlatform('web'))

  it('is written for any element that carries `initial`', () => {
    const { getByTestId } = render(
      <Motion.View
        testID="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />,
    )

    expect(getByTestId('card').props.dataSet).toEqual({ entrance: 'true' })
  })

  it('merges into a consumer’s own dataSet rather than replacing it', () => {
    // `dataSet` is a react-native-web prop; React Native's own `ViewProps`
    // does not declare it, so a web-targeting consumer casts here exactly as
    // this test does. The guard writes its key through the same path, which is
    // why the merge has to be tested rather than assumed.
    const props = {
      testID: 'card',
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      dataSet: { section: 'hero' },
    } as unknown as ComponentProps<typeof Motion.View>

    const { getByTestId } = render(<Motion.View {...props} />)

    expect(getByTestId('card').props.dataSet).toEqual({
      section: 'hero',
      entrance: 'true',
    })
  })

  it('is not written when there is no `initial` to bake', () => {
    const { getByTestId } = render(
      <Motion.View testID="card" animate={{ opacity: 1 }} />,
    )

    expect(getByTestId('card').props.dataSet).toBeUndefined()
  })

  it('is not written for `initial={false}`, which opts out of the mount animation', () => {
    const { getByTestId } = render(
      <Motion.View testID="card" initial={false} animate={{ opacity: 1 }} />,
    )

    expect(getByTestId('card').props.dataSet).toBeUndefined()
  })
})

describe('the entrance marker off web', () => {
  it('is never written — there is no static export to guard', () => {
    setPlatform('ios')
    const { getByTestId } = render(
      <Motion.View
        testID="card"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />,
    )

    expect(getByTestId('card').props.dataSet).toBeUndefined()
  })
})

describe('standing the guard down', () => {
  const realDocument = (globalThis as { document?: unknown }).document

  afterEach(() => {
    __resetInertiaReadyForTests()
    ;(globalThis as { document?: unknown }).document = realDocument
  })

  it('stamps the ready attribute on the first mount on web', () => {
    const attributes: Record<string, string> = {}
    ;(globalThis as { document?: unknown }).document = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attributes[name] = value
        },
        removeAttribute: (name: string) => {
          delete attributes[name]
        },
      },
    }
    setPlatform('web')
    __resetInertiaReadyForTests()

    render(<Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />)

    expect(attributes[READY_ATTRIBUTE]).toBe('true')
  })

  it('does nothing off web, where there is no document to stamp', () => {
    setPlatform('ios')
    __resetInertiaReadyForTests()

    // No `document` global at all — this must not throw.
    expect(() =>
      render(<Motion.View initial={{ opacity: 0 }} animate={{ opacity: 1 }} />),
    ).not.toThrow()
  })
})

/** A plain host must stay plain: no marker, no effect, no extra props. */
describe('the zero-cost plain host', () => {
  it('is untouched by the guard', () => {
    setPlatform('web')
    const { getByTestId } = render(
      <Motion.View testID="plain">
        <View />
      </Motion.View>,
    )

    expect(getByTestId('plain').props.dataSet).toBeUndefined()
  })
})
