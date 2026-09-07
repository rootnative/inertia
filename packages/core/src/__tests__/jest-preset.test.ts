/**
 * The shipped Jest preset is consumer-facing surface that the rest of this
 * suite never loads — the workspace packages point their own `jest.config.js`
 * at `@react-native/jest-preset` directly, so a broken `jest-preset.js` would
 * ship green.
 *
 * That is exactly how RN 0.86 nearly went out broken: it moved its preset into
 * `@react-native/jest-preset` and left `react-native/jest-preset` as a shim
 * that throws unless the new package is installed — and RN declares it as an
 * **optional** peer, which no package manager installs. Every consumer of this
 * preset would have hit that error.
 */
import { readFileSync } from 'node:fs'

// Plain CJS with no declaration file, so state the shape this test reads
// rather than pulling in `any`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const preset = require('@rootnative/inertia/jest-preset') as {
  transform?: Record<string, unknown>
  setupFiles: string[]
  transformIgnorePatterns: string[]
}

describe('shipped jest-preset', () => {
  it('loads without throwing', () => {
    expect(preset).toBeDefined()
  })

  it('carries the react-native preset it layers on', () => {
    // A transform map is the clearest proof the base preset came through: it is
    // what makes RN source compile at all, and this file never sets it.
    expect(preset.transform).toBeDefined()
  })

  // The load test above cannot catch the shim trap on its own: this workspace
  // installs `@react-native/jest-preset`, so `react-native/jest-preset` would
  // resolve here and pass while breaking in a consumer tree that does not have
  // the optional peer. Assert the resolution path itself.
  it('does not resolve through the deprecated react-native shim', () => {
    const source = readFileSync(
      require.resolve('@rootnative/inertia/jest-preset'),
      'utf8',
    )

    expect(source).toContain("require('@react-native/jest-preset')")
    expect(source).not.toContain("require('react-native/jest-preset')")
  })

  it('adds the inertia setup file and the widened transform allowlist', () => {
    expect(preset.setupFiles.some((f: string) => /jest-setup/.test(f))).toBe(
      true,
    )
    expect(String(preset.transformIgnorePatterns[0])).toContain(
      '@rootnative/inertia',
    )
  })
})
