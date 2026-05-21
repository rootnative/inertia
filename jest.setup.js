// Workspace-internal tests share the same Jest setup that ships to consumers
// as `@onlynative/inertia/jest-setup`. Delegating here keeps the mock surface
// in one place — if it works for our tests it works for theirs.
require('./packages/core/jest-setup.js')
