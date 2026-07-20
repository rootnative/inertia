import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2021',
  platform: 'neutral',
  external: [
    '@rootnative/inertia',
    'expo-linear-gradient',
    'react',
    'react/jsx-runtime',
    'react-native',
    'react-native-reanimated',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
