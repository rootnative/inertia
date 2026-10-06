import { render, renderHook } from '@testing-library/react-native'
import * as Reanimated from 'react-native-reanimated'
import { resolveNamedTransitionProp } from '../config/namedTransitions'
import { useGestureLayer } from '../gestureLayer'
import { Motion, MotionConfig, transitionForKey, useGesture } from '../index'
import { __resetWarnOnceForTests } from '../internal/warnOnce'

// A transition map may carry config keys next to its entries:
// `{ type: 'spring', tension: 120, opacity: { type: 'timing' } }`. The config
// keys are the default for every key the map gives no entry. Before this,
// the name resolver read `type: 'spring'` as a transition name and warned,
// and every key with no entry got the library default spring, so `tension`
// and `friction` did nothing.

describe('transitionForKey', () => {
  it('gives every key a top-level config or name', () => {
    const config = { type: 'timing', duration: 200 } as const
    expect(transitionForKey(config, 'opacity')).toBe(config)
    expect(transitionForKey('selection', 'opacity')).toBe('selection')
    expect(transitionForKey(undefined, 'opacity')).toBeUndefined()
  })

  it('gives a key its own entry from a map', () => {
    const entry = { type: 'timing', duration: 200 } as const
    expect(transitionForKey({ opacity: entry }, 'opacity')).toBe(entry)
    expect(transitionForKey({ opacity: entry }, 'scale')).toBeUndefined()
  })

  it('gives a key with no entry the config keys of the map', () => {
    const map = {
      type: 'spring',
      tension: 120,
      friction: 18,
      opacity: { type: 'timing', duration: 320 },
    } as const
    expect(transitionForKey(map, 'scale')).toEqual({
      type: 'spring',
      tension: 120,
      friction: 18,
    })
    expect(transitionForKey(map, 'opacity')).toBe(map.opacity)
  })

  it('does not merge the default into an entry', () => {
    const map = {
      type: 'timing',
      duration: 500,
      delay: 40,
      scale: { type: 'spring' },
    } as const
    expect(transitionForKey(map, 'scale')).toEqual({ type: 'spring' })
  })
})

describe('the mixed form — name resolution', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  it('does not read a config key as a transition name', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const map = {
      type: 'spring',
      tension: 120,
      opacity: { type: 'timing', duration: 320 },
    } as const
    const resolved = resolveNamedTransitionProp(map, {})
    expect(warn).not.toHaveBeenCalled()
    expect(resolved).toBe(map)
  })

  it('still resolves a name in an entry next to config keys', () => {
    const resolved = resolveNamedTransitionProp(
      { type: 'spring', opacity: 'fade' },
      { fade: { type: 'timing', duration: 90 } },
    ) as Record<string, unknown>
    expect(resolved.type).toBe('spring')
    expect(resolved.opacity).toEqual({ type: 'timing', duration: 90 })
  })
})

describe('the mixed form — Motion primitives and gesture hooks', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    __resetWarnOnceForTests()
  })

  it('springs every key but the overridden one, with the map spring', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    render(
      <MotionConfig>
        <Motion.View
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            tension: 120,
            friction: 18,
            opacity: { type: 'timing', duration: 320 },
          }}
        />
      </MotionConfig>,
    )
    expect(warn).not.toHaveBeenCalled()
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 320 })
    // tension / friction map to stiffness / damping one to one.
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![1]).toMatchObject({
      stiffness: 120,
      damping: 18,
    })
  })

  it('gives a gesture layer with no entry the map default', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    const withSpring = jest.spyOn(Reanimated, 'withSpring')
    const { result } = renderHook(() =>
      useGesture({
        type: 'timing',
        duration: 150,
        pressed: { type: 'spring', tension: 300 },
      }),
    )
    result.current.handlers.onHoverIn()
    expect(withTiming).toHaveBeenCalledTimes(1)
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 150 })
    result.current.handlers.onPressIn()
    expect(withSpring).toHaveBeenCalledTimes(1)
    expect(withSpring.mock.calls[0]![1]).toMatchObject({ stiffness: 300 })
  })

  it('gives the disabled layer of useGestureLayer the map default', () => {
    const withTiming = jest.spyOn(Reanimated, 'withTiming')
    renderHook(() =>
      useGestureLayer(
        { rest: { opacity: 0 }, pressed: { opacity: 0.12 } },
        {
          disabled: true,
          transition: {
            type: 'timing',
            duration: 150,
            pressed: { type: 'spring' },
          },
        },
      ),
    )
    expect(withTiming).toHaveBeenCalled()
    expect(withTiming.mock.calls[0]![1]).toMatchObject({ duration: 150 })
  })
})
