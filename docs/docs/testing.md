---
sidebar_position: 11
description: A Reanimated Jest mock and the renderWithMotion helper, so existing suites can assert on animated UI.
---

# Testing

Inertia ships a Reanimated Jest mock and a `renderWithMotion` helper, so an existing test suite can assert on animated UI without knowledge of how the mock is wired.

:::tip Do you assert post-animation styles? Use `renderWithMotion`.

Plain `render(...)` returns the `initial` styles only, because the mock doesn't flush effects synchronously. If your tests see the pre-animation state, and you write comments like _"don't assert post-interaction styles, the mock is static-render"_, that's the wrong workaround. Swap `render` for `renderWithMotion`, and the rendered tree settles on the `animate` target.

```ts
import { renderWithMotion } from '@rootnative/inertia/testing'

const { getByTestId } = renderWithMotion(<Card />)
// getByTestId('card').props.style now reflects the animate target,
// not the initial seed.
```

For a prop change after mount (a `useState` that toggles `animate`, a controller transition), pair it with `flushMotion(result, nextUi)`. See [below](#flushmotionresult-nextui).

:::

## Setup

Inertia ships a Jest preset that sets up everything: the Reanimated mock, the `react-native-worklets` stub, the `Easing.bezier()` factory shape, and the wider `transformIgnorePatterns` that let Jest transform the published ESM bundles of `@rootnative/inertia*`.

Install `@react-native/jest-preset` first. React Native 0.86 moved its Jest preset into that package and declares it as an **optional** peer, so no package manager installs it for you:

```bash
npm install --save-dev @react-native/jest-preset
```

Then point Jest at the Inertia preset with one line:

```js
// jest.config.js
module.exports = {
  preset: require.resolve('@rootnative/inertia/jest-preset'),
}
```

The preset extends `@react-native/jest-preset` internally, so you don't need to reference both. If you already have your own setup files or `transformIgnorePatterns`, extend the preset:

```js
const inertia = require('@rootnative/inertia/jest-preset')

module.exports = {
  ...inertia,
  setupFiles: [...inertia.setupFiles, '<rootDir>/my-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@rootnative/inertia|@rootnative/inertia-gestures|@rootnative/inertia-gradients|@rootnative/inertia-svg|react-native-worklets|my-other-esm-pkg)/)',
  ],
}
```

If you can't use the preset (for example, a custom transform pipeline conflicts with it), add the setup file directly. Check the preset name: `preset: 'react-native'` was the spelling before 0.86, and it now throws, because that path is a shim that only re-exports the package above.

```js
module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: [require.resolve('@rootnative/inertia/jest-setup')],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@rootnative/inertia|@rootnative/inertia-gestures|@rootnative/inertia-gradients|@rootnative/inertia-svg|react-native-worklets)/)',
  ],
}
```

The mock is **static-render**: animations don't run. But `useSharedValue` is backed by `useRef`, so a value that an effect writes persists across re-renders. Together with `renderWithMotion`, that's enough to assert post-animation styles in a unit test.

## `renderWithMotion`

Use it in place of the `render` of `@testing-library/react-native`. It returns the same render result, with the rendered tree already flushed to the `animate` target.

`@rootnative/inertia/testing` is the only entry point that needs `@testing-library/react-native`. That package is an optional peer of `@rootnative/inertia`, version 13 or later. Install it in your devDependencies before you import this entry point.

```ts
import { renderWithMotion } from '@rootnative/inertia/testing'
import { Motion } from '@rootnative/inertia'

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

Without the helper, plain `render(...)` returns the `initial` styles. That's the static-render trade-off of the mock. Inertia tests its own primitives this way too. See `packages/core/src/__tests__/testing-helper.test.tsx`.

## `flushMotion(result, nextUi)`

For a test that changes props between flushes (a `useState` that toggles `animate`, a controller transition), call `rerender` once with the new element, and then call `flushMotion` to apply the second pass:

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

`flushMotion` clones the element internally, so React doesn't skip the render for the same element reference. So you can pass the same element twice in a row.

## What you can and can't assert

The mock resolves only to **terminal targets**. It doesn't simulate frames. So you can:

- ✅ Assert post-animation styles (`renderWithMotion` flushes once)
- ✅ Spy on `withSpring`, `withTiming`, and `withDecay` to check how Inertia compiles a transition (see `packages/core/src/__tests__/memoization.test.tsx` for the pattern)
- ✅ Capture the settle callback from `withSpring` or `withTiming` to fire `onAnimationEnd` by hand (see `onAnimationEnd.test.tsx`)

You can't:

- ❌ Assert an intermediate frame (`opacity` halfway from 0 to 1)
- ❌ Make a timing-based assertion, because there is no timer to advance
- ❌ Snapshot the gesture-driven UI (`gesture.pressed`) without the matching React Native event first, because the mock doesn't simulate input

For frame-level correctness, check by hand in the example app. There is a screen per primitive in [`example/screens/`](https://github.com/rootnative/inertia/tree/main/example/screens). Some behavior appears only on real hardware: dropped-frame parity, native `inset` shadow rendering, shared-element measurement, and the reflow cost of the layout keys. Those have a run procedure in [Device validation](./device-validation).

## Migrating existing tests

If your test suite asserted against raw `react-native-reanimated` shared values before:

```diff
- import { render } from '@testing-library/react-native'
+ import { renderWithMotion } from '@rootnative/inertia/testing'

- const { getByTestId } = render(<Card />)
+ const { getByTestId } = renderWithMotion(<Card />)
```

For a test that called `act` and `jest.runAllTimers()` to push an animation through, remove both. The mock needs no timers, and `renderWithMotion` does the extra render pass for you.
