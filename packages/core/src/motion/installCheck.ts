import { reanimatedVersion } from 'react-native-reanimated'

declare const __DEV__: boolean
declare const process: { env?: Record<string, string | undefined> }

let alreadyChecked = false

/**
 * Surface a clear, actionable error at first `createMotionComponent` call when
 * the consumer's Reanimated install is broken. Repeat calls and Jest test runs
 * are skipped. The check runs in production builds too: it is one function
 * and one property read, and the failure it reports has no other signal
 * there. Two failure modes are detectable from JS:
 *
 * 1. `react-native-reanimated` resolves but is on a v3.x line we don't
 *    support (the plugin name and worklet runtime both changed at v4).
 * 2. The worklets babel plugin (`react-native-worklets/plugin` in v4) did not
 *    run on this package, so `'worklet'` directives are dead strings. On
 *    native the first `withSpring` / `withTiming` call crashes on the UI
 *    thread with a generic "non-worklet function called" error. On web
 *    nothing crashes: every animated style stays at its first frame, and a
 *    production build shows no error at all. A web bundler that excludes
 *    `node_modules` from Babel, which is the default for most non-Metro
 *    setups, produces exactly that.
 *
 * The "Reanimated isn't installed at all" case isn't handled here — Metro
 * fails to resolve the static `import 'react-native-reanimated'` at the top
 * of `createMotionComponent.tsx` long before this check runs.
 */
export function ensureReanimatedInstalled(): void {
  if (alreadyChecked) return
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
        `[inertia] react-native-reanimated ${version} is installed, but @rootnative/inertia requires 4.0.0 or later. Upgrade it.`,
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
    console.error(MISSING_PLUGIN_MESSAGE)
  }
}

export const MISSING_PLUGIN_MESSAGE =
  '[inertia] The worklets Babel plugin did not run on @rootnative/inertia, so no animation can play. ' +
  "'react-native-worklets/plugin' must run on your app source and on node_modules/@rootnative, node_modules/react-native-reanimated and node_modules/react-native-worklets. " +
  'Metro: add it last in babel.config.js plugins, then `npx expo start -c`. ' +
  'Vite or webpack: Babel skips node_modules by default; add those packages to its include.'
