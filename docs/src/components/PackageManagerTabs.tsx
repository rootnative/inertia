import React from 'react'
import Tabs from '@theme/Tabs'
import TabItem from '@theme/TabItem'
import CodeBlock from '@theme/CodeBlock'

type Action = 'add' | 'install' | 'remove' | 'run'

type Props = {
  packages?: string
  command?: string
  dev?: boolean
  action?: Action
}

const MANAGERS = [
  { value: 'yarn', label: 'Yarn' },
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'bun', label: 'Bun' },
] as const

function commandFor(
  manager: (typeof MANAGERS)[number]['value'],
  action: Action,
  packages: string,
  dev: boolean,
): string {
  const devFlag = dev ? ' -D' : ''
  switch (manager) {
    case 'yarn':
      if (action === 'add') return `yarn add${devFlag} ${packages}`
      if (action === 'install') return `yarn install`
      if (action === 'remove') return `yarn remove ${packages}`
      return `yarn ${packages}`
    case 'npm':
      if (action === 'add')
        return `npm install${dev ? ' --save-dev' : ''} ${packages}`
      if (action === 'install') return `npm install`
      if (action === 'remove') return `npm uninstall ${packages}`
      return `npm run ${packages}`
    case 'pnpm':
      if (action === 'add') return `pnpm add${devFlag} ${packages}`
      if (action === 'install') return `pnpm install`
      if (action === 'remove') return `pnpm remove ${packages}`
      return `pnpm ${packages}`
    case 'bun':
      if (action === 'add') return `bun add${devFlag} ${packages}`
      if (action === 'install') return `bun install`
      if (action === 'remove') return `bun remove ${packages}`
      return `bun run ${packages}`
  }
}

export default function PackageManagerTabs({
  packages,
  command,
  dev = false,
  action = 'add',
}: Props): React.JSX.Element {
  return (
    <Tabs groupId="package-manager" defaultValue="yarn">
      {MANAGERS.map((m) => {
        const cmd =
          command !== undefined
            ? commandForRaw(m.value, command)
            : commandFor(m.value, action, packages ?? '', dev)
        return (
          <TabItem key={m.value} value={m.value} label={m.label}>
            <CodeBlock language="bash">{cmd}</CodeBlock>
          </TabItem>
        )
      })}
    </Tabs>
  )
}

function commandForRaw(
  manager: (typeof MANAGERS)[number]['value'],
  command: string,
): string {
  return `${manager} ${command}`
}
