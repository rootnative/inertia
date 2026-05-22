import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'motion/View': 'src/motion/View.tsx',
    'motion/Text': 'src/motion/Text.tsx',
    'motion/Image': 'src/motion/Image.tsx',
    'motion/Pressable': 'src/motion/Pressable.tsx',
    'motion/ScrollView': 'src/motion/ScrollView.tsx',
    'testing/index': 'src/testing/index.ts',
    'touch/index': 'src/touch/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2021',
  platform: 'neutral',
  external: [
    'react',
    'react/jsx-runtime',
    'react-native',
    'react-native-reanimated',
    '@testing-library/react-native',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
