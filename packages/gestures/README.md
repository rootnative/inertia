# @rootnative/inertia-gestures

[![npm](https://img.shields.io/npm/v/@rootnative/inertia-gestures.svg)](https://www.npmjs.com/package/@rootnative/inertia-gestures)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Drag / pan / swipe hooks for [`@rootnative/inertia`](../core), built on [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/). Optional sibling package — install only when you need richer-than-`pressable` gestures. The core library has no required `gesture-handler` dependency.

The hooks compose with any `Motion.*` primitive via a `<GestureDetector>` and a single `style` slot — they don't replace the core `gesture` prop, they extend what's reachable beside it.

## Install

```sh
pnpm add @rootnative/inertia-gestures react-native-gesture-handler
```

Then follow the [`react-native-gesture-handler` install guide](https://docs.swmansion.com/react-native-gesture-handler/docs/installation) — it needs `<GestureHandlerRootView>` near the root of your app.

**Peer dependencies:** `@rootnative/inertia` (workspace or installed), `react >=19.0.0`, `react-native >=0.81.0`, `react-native-reanimated >=4.0.0`, `react-native-gesture-handler >=2.0.0`.

## What ships

- **`useDrag`** — one- or two-axis drag with optional bounds and rubber-band overshoot. Accepts an `onRelease` worklet that returns per-axis Inertia release transitions (snap-to-tick spring, decay with bounds, etc.). The release velocity stays on the UI thread — no JS round-trip.
- **`usePan`** — camera-style pan with momentum on release.
- **`useSwipe`** — directional commit-or-snap-back (distance + velocity thresholds).

## Usage

```tsx
import { GestureDetector } from 'react-native-gesture-handler'
import { Motion } from '@rootnative/inertia'
import { useDrag } from '@rootnative/inertia-gestures'

function DraggableBox() {
  const drag = useDrag({
    axis: 'both',
    bounds: { left: -120, right: 120, top: -120, bottom: 120 },
  })

  return (
    <GestureDetector gesture={drag.gesture}>
      <Motion.View style={drag.style} />
    </GestureDetector>
  )
}
```

## Documentation

- Full docs: [https://rootnative.github.io/inertia/docs/gestures-adapter](https://rootnative.github.io/inertia/docs/gestures-adapter)
- Core library: [`@rootnative/inertia`](../core)

AI agents: this package ships its own copy of the reference — read `node_modules/@rootnative/inertia-gestures/llms.txt` for the full API, no network needed.

## License

[MIT](./LICENSE) © RootNative
