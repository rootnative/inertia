import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    { type: 'doc', id: 'index', label: 'Introduction' },
    { type: 'doc', id: 'installation', label: 'Installation' },
    {
      type: 'category',
      label: 'Primitives',
      collapsed: false,
      items: [
        'primitives/index',
        'primitives/view',
        'primitives/text',
        'primitives/image',
        'primitives/pressable',
        'primitives/scroll-view',
      ],
    },
    { type: 'doc', id: 'transitions', label: 'Transitions' },
    { type: 'doc', id: 'sequences', label: 'Sequences & repeat' },
    { type: 'doc', id: 'variants', label: 'Variants' },
    { type: 'doc', id: 'gestures', label: 'Gestures' },
    { type: 'doc', id: 'gestures-adapter', label: 'Gestures adapter' },
    { type: 'doc', id: 'gradients', label: 'Gradients' },
    { type: 'doc', id: 'svg', label: 'SVG' },
    { type: 'doc', id: 'presence', label: 'Presence' },
    { type: 'doc', id: 'layout', label: 'Layout' },
    { type: 'doc', id: 'motion-config', label: 'MotionConfig' },
    { type: 'doc', id: 'perf-bench', label: 'Perf bench' },
    { type: 'doc', id: 'testing', label: 'Testing' },
    { type: 'doc', id: 'ai', label: 'AI agents & llms.txt' },
    {
      type: 'category',
      label: 'Migrations',
      collapsed: false,
      items: ['migrations/from-reanimated'],
    },
    {
      type: 'category',
      label: 'API',
      collapsed: false,
      items: [
        'api/hooks',
        'api/create-motion-component',
        'api/transition-utilities',
        'api/reanimated-interop',
      ],
    },
  ],
}

export default sidebars
