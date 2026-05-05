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
    { type: 'doc', id: 'presence', label: 'Presence' },
    { type: 'doc', id: 'motion-config', label: 'MotionConfig' },
    {
      type: 'category',
      label: 'API',
      collapsed: false,
      items: ['api/hooks', 'api/create-motion-component'],
    },
  ],
}

export default sidebars
