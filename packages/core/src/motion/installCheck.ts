import { reanimatedVersion } from 'react-native-reanimated'

declare const __DEV__: boolean
declare const process: { env?: Record<string, string | undefined> }

let alreadyChecked = false

/**
 * Surface a clear, actionable error at first `createMotionComponent` call when
 * the consumer's Reanimated install is broken. Production builds, repeat calls,
 * and Jest test runs are all skipped — the check is purely a dev-time
 * paper-cut sander for the two failure modes we can detect from JS:
 *
 * 1. `react-native-reanimated` resolves but is on a v3.x line we don't
 *    support (the plugin name and worklet runtime both changed at v4).
 * 2. The worklets babel plugin (`react-native-worklets/plugin` in v4) isn't
 *    wired into `babel.config.js`, so `'worklet'` directives are dead strings
 *    and the first `withSpring` / `withTiming` call would crash on the UI
 *    thread with a generic "non-worklet function called" error.
 *
 * The "Reanimated isn't installed at all" case isn't handled here — Metro
 * fails to resolve the static `import 'react-native-reanimated'` at the top
 * of `createMotionComponent.tsx` long before this check runs.
 */
export function ensureReanimatedInstalled(): void {
  if (!__DEV__ || alreadyChecked) return
  // The standard `react-native-reanimated/mock` doesn't run the worklets
  // babel plugin, so the marker probe would false-positive every test run.
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return
  }
  alreadyChecked = true

  // Read the version off Reanimated's own runtime export rather than reaching
  // into its `package.json`. A `require('.../package.json')` here would make
  // esbuild emit a `__require` shim that throws on web bundlers (Expo web), and
  // Reanimated's `exports` field may block the subpath anyway.
  const version: string | undefined = reanimatedVersion

  if (version) {
    const major = parseInt(version.split('.')[0] ?? '0', 10)
    if (major < 4) {
      console.error(
        `[inertia] react-native-reanimated v${version} is installed, but @onlynative/inertia requires v4.0.0 or later. ` +
          `Upgrade with \`pnpm add react-native-reanimated@^4\` (or your package manager's equivalent).`,
      )
      return
    }
  }

  // The worklets plugin rewrites any function carrying a top-of-body
  // `'worklet'` directive to expose a `__workletHash` property at runtime.
  // Its absence means the plugin didn't run.
  const probe = function probe() {
    'worklet'
    return 0
  } as { __workletHash?: number }
  if (typeof probe.__workletHash !== 'number') {
    console.error(
      `[inertia] The Reanimated worklets babel plugin is not configured. ` +
        `Add \`'react-native-worklets/plugin'\` as the LAST entry in the \`plugins\` array of your \`babel.config.js\`, ` +
        `then restart Metro with a fresh cache: \`npx expo start -c\` or \`npx react-native start --reset-cache\`.`,
    )
  }
}
