import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import reactNativePlugin from 'eslint-plugin-react-native'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/.docusaurus/**',
      '**/static/example/**',
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        global: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // `react-hooks/immutability` comes from the React Compiler, which treats
      // every value a hook returns as frozen. A Reanimated `SharedValue` —
      // what `useSharedValue` and inertia's `useMotionValue` return — is
      // mutated through `.value`, and that write IS the type's entire API. It
      // never triggers a render, so the hazard the rule describes cannot
      // happen. No refactor satisfies the rule; the write is the operation.
      // Off repo-wide for that reason in `ui`, `inertia`, `impulse` and
      // `rootnative`. It is the only React Compiler rule any of them turns
      // off repo-wide. The narrower blocks at the end of this file switch
      // off other compiler rules for named files and for tests; those lists
      // are specific to this repo and do not match the other three.
      'react-hooks/immutability': 'off',
      'no-undef': 'off',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-native/no-inline-styles': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        jest: 'readonly',
        test: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  prettierConfig,
  {
    // React Compiler rules off in tests and type-tests. A harness deliberately
    // does what they forbid — assigning a hook result to a module-level `let`,
    // rendering a component only to reach its API. None of it ships.
    files: [
      '**/__tests__/**/*.{ts,tsx}',
      '**/__type-tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.test-d.{ts,tsx}',
    ],
    rules: {
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    // `react-hooks/refs`, scoped to the files where a ref read or written
    // during render IS the architecture — not a slip.
    //
    // Each of these hooks answers the same question: "give me a value that is
    // stable across renders, decided during this render, without causing a
    // re-render." `useState` would re-render; `useMemo` is a hint React may
    // discard; a ref is the only construct that does it. `createMotionComponent`
    // is the clearest case — its monotonic active-key set decides what the
    // worklet emits in the SAME render that grows it, and its memoization is a
    // pinned guarantee (`memoization.test.tsx`). The React Compiler forbids the
    // pattern outright, so there is no way to satisfy it short of rearchitecting
    // the factory.
    //
    // Scoped per file on purpose: the rule stays ON for every other file and
    // for anything new, so a genuine accidental ref-in-render is still caught.
    // Do not add a file here without the same justification.
    files: [
      'packages/core/src/motion/createMotionComponent.tsx',
      'packages/core/src/presence/Presence.tsx',
      'packages/core/src/layout/useSharedLayout.ts',
      'packages/core/src/touch/useTouchDrag.ts',
      'packages/core/src/values/useAnimator.ts',
      'packages/core/src/values/useColorCascade.ts',
      'packages/core/src/values/useVariants.ts',
      'packages/gestures/src/useLatestCallback.ts',
      'packages/gradients/src/MotionLinearGradient.tsx',
      'packages/svg/src/MotionPath.tsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
  {
    // The benchmark deliberately swaps one of two row components by mode, so
    // the memo's first argument is not an inline literal the compiler can read.
    // Swapping it for a conditional hook would change what the benchmark
    // measures — view parity between the two rows is the whole point.
    files: ['example/screens/PerfBenchScreen.tsx'],
    rules: {
      'react-hooks/use-memo': 'off',
    },
  },
]
