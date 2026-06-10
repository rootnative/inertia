import path from 'path'
import type * as Preset from '@docusaurus/preset-classic'
import type { Config } from '@docusaurus/types'

const config: Config = {
  title: 'Inertia',
  tagline: 'Declarative animation primitives for React Native',
  url: 'https://rootnative.github.io',
  baseUrl: '/inertia/',
  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
  ],

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/rootnative/inertia/edit/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-react-docgen-typescript',
      {
        src: [path.resolve(__dirname, '../packages/core/src/**/*.{ts,tsx}')],
        global: true,
        parserOptions: {
          shouldExtractLiteralValuesFromEnum: true,
          shouldRemoveUndefinedFromOptional: true,
          propFilter: (prop: { parent?: { fileName: string } }) => {
            if (prop.parent) {
              return !prop.parent.fileName.includes('node_modules')
            }
            return true
          },
        },
      },
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        indexBlog: false,
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Inertia',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://rootnative.github.io/inertia/example/',
          label: 'Example',
          position: 'right',
        },
        {
          href: 'https://github.com/rootnative/inertia',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/introduction' },
            { label: 'Installation', to: '/installation' },
            { label: 'Transitions', to: '/transitions' },
            { label: 'Variants', to: '/variants' },
          ],
        },
        {
          title: 'Primitives',
          items: [
            { label: 'Motion.View', to: '/primitives/view' },
            { label: 'Motion.Text', to: '/primitives/text' },
            { label: 'Motion.Pressable', to: '/primitives/pressable' },
            { label: 'All primitives', to: '/primitives' },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Example app',
              href: 'https://rootnative.github.io/inertia/example/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/rootnative/inertia',
            },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@rootnative/inertia',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RootNative — MIT Licensed`,
    },
    prism: {
      additionalLanguages: ['bash'],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
