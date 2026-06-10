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
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} RootNative`,
    },
    prism: {
      additionalLanguages: ['bash'],
    },
  } satisfies Preset.ThemeConfig,
}

export default config
