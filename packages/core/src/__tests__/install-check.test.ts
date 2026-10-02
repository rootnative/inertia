/**
 * `ensureReanimatedInstalled` is the only signal a consumer gets when the
 * worklets Babel plugin did not run on this package. Jest never runs that
 * plugin, so the probe inside the check sees exactly what a web bundler that
 * skips `node_modules` produces. The check skips `NODE_ENV === 'test'`, so
 * each test here sets the env it wants and loads a fresh module.
 */

type Env = { NODE_ENV?: string; DEV?: boolean }

function loadWithEnv({ NODE_ENV, DEV }: Env) {
  const previousEnv = process.env.NODE_ENV
  const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__
  process.env.NODE_ENV = NODE_ENV
  ;(globalThis as { __DEV__?: boolean }).__DEV__ = DEV
  let mod: typeof import('../motion/installCheck')
  jest.isolateModules(() => {
    mod = require('../motion/installCheck')
  })
  const restore = () => {
    process.env.NODE_ENV = previousEnv
    ;(globalThis as { __DEV__?: boolean }).__DEV__ = previousDev
  }
  return { ...mod!, restore }
}

describe('ensureReanimatedInstalled', () => {
  let error: jest.SpyInstance

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    error.mockRestore()
  })

  it('reports the missing plugin in a production build', () => {
    const { ensureReanimatedInstalled, MISSING_PLUGIN_MESSAGE, restore } =
      loadWithEnv({ NODE_ENV: 'production', DEV: false })
    ensureReanimatedInstalled()
    restore()
    expect(error).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith(MISSING_PLUGIN_MESSAGE)
  })

  it('reports it once, not on every Motion render', () => {
    const { ensureReanimatedInstalled, restore } = loadWithEnv({
      NODE_ENV: 'production',
      DEV: false,
    })
    ensureReanimatedInstalled()
    ensureReanimatedInstalled()
    restore()
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('names the node_modules rule and both bundler cases', () => {
    const { MISSING_PLUGIN_MESSAGE } = loadWithEnv({
      NODE_ENV: 'production',
      DEV: false,
    })
    expect(MISSING_PLUGIN_MESSAGE).toContain('node_modules/@rootnative')
    expect(MISSING_PLUGIN_MESSAGE).toContain(
      'node_modules/react-native-reanimated',
    )
    expect(MISSING_PLUGIN_MESSAGE).toContain(
      'node_modules/react-native-worklets',
    )
    expect(MISSING_PLUGIN_MESSAGE).toContain('babel.config.js')
    expect(MISSING_PLUGIN_MESSAGE).toContain('Vite')
  })

  it('stays silent under Jest, where the plugin never runs', () => {
    const { ensureReanimatedInstalled, restore } = loadWithEnv({
      NODE_ENV: 'test',
      DEV: true,
    })
    ensureReanimatedInstalled()
    restore()
    expect(error).not.toHaveBeenCalled()
  })
})
