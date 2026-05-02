const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

const singletons = [
  'react',
  'react-native',
  'react-native-reanimated',
  'react-native-worklets',
]
config.resolver.extraNodeModules = singletons.reduce((acc, name) => {
  acc[name] = path.resolve(workspaceRoot, 'node_modules', name)
  return acc
}, {})

module.exports = config
