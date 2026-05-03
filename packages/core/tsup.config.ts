import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'motion/View': 'src/motion/View.tsx',
    'motion/Text': 'src/motion/Text.tsx',
    'motion/Image': 'src/motion/Image.tsx',
    'motion/Pressable': 'src/motion/Pressable.tsx',
    'motion/ScrollView': 'src/motion/ScrollView.tsx',
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
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
