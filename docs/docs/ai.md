---
sidebar_position: 12
description: Machine-readable API references (llms.txt) for coding agents — hosted on this site and shipped inside every npm package.
---

# Using Inertia with AI agents

Inertia publishes its API reference in the [llms.txt](https://llmstxt.org/) format, so a coding agent (Claude Code, Cursor, Copilot, and others) can answer questions about the library without guesses from type signatures.

## Hosted on this site

- [`/llms.txt`](pathname:///llms.txt): a concise overview with the install, the imports, the primitives, the transition shapes, and links.
- [`/llms-full.txt`](pathname:///llms-full.txt): the full API reference for every package, generated from the TypeScript source.

Point an agent at either URL, or paste the contents into its context.

## Shipped inside the npm packages

Every published package carries its own `llms.txt`, so an agent in your repo can read the reference straight from `node_modules`. It needs no network access:

```
node_modules/@rootnative/inertia/llms.txt
node_modules/@rootnative/inertia-gestures/llms.txt
node_modules/@rootnative/inertia-gradients/llms.txt
node_modules/@rootnative/inertia-svg/llms.txt
```

If your agent supports project-level instructions (a `CLAUDE.md`, a `.cursorrules`, or a similar file), one line is enough:

```md
When working with @rootnative/inertia, read
node_modules/@rootnative/inertia/llms.txt for the full API reference.
```

## Keeping it current

Every release generates the per-package files and `/llms-full.txt` again from the source, so the reference in your `node_modules` always matches the version that you installed.
