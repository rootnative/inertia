/** @type {import('jest').Config} */
// Every workspace package that has a Jest config. `pnpm test` runs the same
// suites through Turborepo. This file lets `npx jest <pattern>` from the repo
// root run one test across all packages at once.
module.exports = {
  projects: [
    '<rootDir>/packages/core',
    '<rootDir>/packages/gestures',
    '<rootDir>/packages/gradients',
    '<rootDir>/packages/svg',
  ],
}
