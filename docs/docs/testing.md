---
sidebar_position: 11
---

# Testing

Inertia ships a Reanimated Jest mock and a `renderWithMotion` helper so existing test suites don't need to learn how the mock is wired before they can assert on animated UI.

## Setup

Inertia ships a Jest preset that wires everything up — the Reanimated mock, the `react-native-worklets` stub, the `Easing.bezier()` factory shape, and the `transformIgnorePatterns` widening needed to let Jest transform `@onlynative/inertia*`'s published ESM bundles. Point Jest at it with one line:

```js
// jest.config.js
module.exports = {
  preset: require.resolve('@onlynative/inertia/jest-preset'),
}
```

The preset internally extends `react-native`'s own preset, so you don't need to reference both. If you already have setup files or `transformIgnorePatterns` of your own, extend the preset:

```js
const inertia = require('@onlynative/inertia/jest-preset')

module.exports = {
  ...inertia,
  setupFiles: [...inertia.setupFiles, '<rootDir>/my-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@onlynative/inertia|@onlynative/inertia-gestures|@onlynative/inertia-gradients|@onlynative/inertia-svg|react-native-worklets|my-other-esm-pkg)/)',
  ],
}
```

If you can't use the preset (e.g. you have a custom transform pipeline that conflicts), add the setup file directly:

```js
module.exports = {
  preset: 'react-native',
  setupFiles: [require.resolve('@onlynative/inertia/jest-setup')],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@onlynative/inertia|@onlynative/inertia-gestures|@onlynative/inertia-gradients|@onlynative/inertia-svg|react-native-worklets)/)',
  ],
}
```

The mock is **static-render**: animations don't actually run, but `useSharedValue` is `useRef`-backed so values written by an effect persist across re-renders. Combined with `renderWithMotion`, that's enough to assert post-animation styles in unit tests.

## `renderWithMotion`

Use it as a drop-in for `@testing-library/react-native`'s `render`. It returns the same render result, with the rendered tree already flushed to the `animate` target.

```ts
import { renderWithMotion } from '@onlynative/inertia/testing'
import { Motion } from '@onlynative/inertia'

it('fades in to opacity: 1', () => {
  const { getByTestId } = renderWithMotion(
    <Motion.View
      testID="card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />,
  )

  expect(getByTestId('card').props.style).toMatchObject({ opacity: 1 })
})
```

Without the helper, plain `render(...)` returns the `initial` styles — that's the static-render trade-off the mock makes. Inertia tests its own primitives this way too; see `packages/core/src/__tests__/testing-helper.test.tsx`.

## `flushMotion(result, nextUi)`

For tests that change props between flushes (a `useState` toggling `animate`, a controller transition), `rerender` once with the new element and then call `flushMotion` to apply the second pass:

```ts
const result = renderWithMotion(
  <Motion.View testID="card" animate={{ opacity: 0.4 }} />,
)

// later in the test, after some interaction:
const next = <Motion.View testID="card" animate={{ opacity: 0.9 }} />
result.rerender(next)
flushMotion(result, next)

expect(getStyle(result).opacity).toBe(0.9)
```

`flushMotion` clones the element internally to defeat React's element-reference bail-out, so passing the same element twice in a row works.

## What you can and can't assert

The mock only resolves to **terminal targets** — it doesn't simulate frames. So you can:

- ✅ Assert post-animation styles (`renderWithMotion` flushes once)
- ✅ Spy on `withSpring` / `withTiming` / `withDecay` to verify how Inertia compiles a transition (see `packages/core/src/__tests__/memoization.test.tsx` for the pattern)
- ✅ Capture the settle callback from `withSpring` / `withTiming` to fire `onAnimationEnd` manually (see `onAnimationEnd.test.tsx`)

You cannot:

- ❌ Assert intermediate frames (`opacity` halfway from 0 to 1)
- ❌ Make timing-based assertions — there is no timer to advance
- ❌ Snapshot the gesture-driven UI (`gesture.pressed`) without firing the corresponding RN event first; the mock doesn't simulate input

For frame-level correctness, validate manually in the example app — there's a screen per primitive in [`example/screens/`](https://github.com/onlynative/inertia/tree/main/example/screens).

## Migrating existing tests

If your test suite was previously asserting against raw `react-native-reanimated` shared values:

```diff
- import { render } from '@testing-library/react-native'
+ import { renderWithMotion } from '@onlynative/inertia/testing'

- const { getByTestId } = render(<Card />)
+ const { getByTestId } = renderWithMotion(<Card />)
```

For tests that previously called `act` + `jest.runAllTimers()` to push animations through, drop both — the mock skips the timer dance and `renderWithMotion` does the rendering shuffle for you.
