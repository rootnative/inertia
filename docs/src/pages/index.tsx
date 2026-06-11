import React from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './index.module.css'

const INSTALL_COMMAND = 'npm install @rootnative/inertia'

function CopyCommand() {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(INSTALL_COMMAND).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return (
    <button
      type="button"
      className={styles.copyCommand}
      onClick={handleCopy}
      aria-label="Copy install command"
    >
      <span className={styles.copyPrompt}>$</span>
      <code className={styles.copyText}>{INSTALL_COMMAND}</code>
      <span className={styles.copyIcon} aria-hidden>
        {copied ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </span>
    </button>
  )
}

function Hero() {
  const { siteConfig } = useDocusaurusContext()
  const exampleUrl = useBaseUrl('/example/')

  return (
    <header className={styles.hero}>
      <div className={styles.heroGrid} aria-hidden />
      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            React Native · Reanimated 4
          </span>
          <h1 className={styles.heroTitle}>
            Declarative animations for React Native.
          </h1>
          <p className={styles.heroTagline}>
            {siteConfig.tagline}. A thin wrapper around react-native-reanimated
            — animations are props on a component. No shared values, no
            worklets, no{' '}
            <code className={styles.inlineCode}>useAnimatedStyle</code>{' '}
            boilerplate.
          </p>
          <div className={styles.heroCtas}>
            <Link className={styles.ctaPrimary} to="/introduction">
              Get Started
            </Link>
            <Link className={styles.ctaSecondary} to="/primitives">
              Browse Primitives
            </Link>
          </div>
          <CopyCommand />
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.phoneFrame} aria-label="Live example preview">
            <div className={styles.phoneNotch} />
            <iframe
              src={exampleUrl}
              title="Inertia live example"
              className={styles.phoneScreen}
              loading="lazy"
              allow="accelerometer; gyroscope"
            />
          </div>
          <Link
            className={styles.demoOpenLink}
            href={exampleUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open example in new tab ↗
          </Link>
        </div>
      </div>
    </header>
  )
}

const stats = [
  { value: '5', label: 'Primitives' },
  { value: '0', label: 'Worklets to write' },
  { value: '100%', label: 'TypeScript' },
  { value: 'MIT', label: 'Licensed' },
]

function Stats() {
  return (
    <section className={styles.stats}>
      <div className={styles.statsInner}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statItem}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

const steps = [
  {
    number: '01',
    title: 'Install',
    description: 'Add Inertia and Reanimated, then enable the Babel plugin.',
    command: 'yarn add @rootnative/inertia react-native-reanimated',
  },
  {
    number: '02',
    title: 'Import',
    description: 'Pull in the Motion namespace — or a tree-shakable subpath.',
    command: "import { Motion } from '@rootnative/inertia'",
  },
  {
    number: '03',
    title: 'Animate',
    description: 'Express animations as props. No worklets, no shared values.',
    command: '<Motion.View animate={{ opacity: 1 }} />',
  },
]

function HowItWorks() {
  return (
    <section className={styles.howItWorks}>
      <div className={styles.howItWorksInner}>
        <h2 className={styles.sectionTitle}>Get started in 3 steps</h2>
        <p className={styles.sectionSubtitle}>
          From zero to your first animation in under a minute.
        </p>
        <div className={styles.stepsGrid}>
          {steps.map((step) => (
            <div key={step.number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDescription}>{step.description}</p>
              <code className={styles.stepCommand}>{step.command}</code>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: 'Props, not boilerplate',
    description:
      'Express animations as props on a component. Shared values, worklets, and useAnimatedStyle stay hidden by default.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    title: 'Per-primitive style inference',
    description:
      'Motion.View accepts ViewStyle keys. Motion.Text accepts TextStyle. Motion.Image accepts ImageStyle. Wrong props error at compile time.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7l8-4 8 4-8 4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 17l8 4 8-4" />
      </svg>
    ),
  },
  {
    title: 'react-spring vocabulary',
    description:
      'Springs use tension, friction, mass, velocity. Reanimated’s raw stiffness / damping never appear in the public API.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 12c2 0 2-5 4-5s2 10 4 10 2-10 4-10 2 5 4 5" />
      </svg>
    ),
  },
  {
    title: 'One gesture prop',
    description:
      'pressed, focused, focusVisible, hovered on every primitive. No whileTap / whilePress soup, no separate pressable variant.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11V5a2 2 0 1 1 4 0v6" />
        <path d="M13 7a2 2 0 1 1 4 0v6" />
        <path d="M17 9a2 2 0 1 1 4 0v6a6 6 0 0 1-6 6h-3a6 6 0 0 1-5.2-3l-2.8-5a2 2 0 0 1 3.4-2L9 14V8a2 2 0 1 1 4 0" />
      </svg>
    ),
  },
  {
    title: 'Tree-shakable subpaths',
    description:
      'Import only what you animate via @rootnative/inertia/view, /text, /image, /pressable, /scroll-view. Bundle size is verified per primitive in CI.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M6 8.5v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3" />
        <path d="M12 13.5v2" />
      </svg>
    ),
  },
  {
    title: 'Stable, memoized worklets',
    description:
      'The factory hashes resolved animate / transition objects. Re-renders with unchanged values produce zero new UI-thread closures.',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M4.2 4.2l2.1 2.1" />
        <path d="M17.7 17.7l2.1 2.1" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="M4.2 19.8l2.1-2.1" />
        <path d="M17.7 6.3l2.1-2.1" />
      </svg>
    ),
  },
]

function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <h2 className={styles.sectionTitle}>Why Inertia</h2>
        <p className={styles.sectionSubtitle}>
          Built to clear specific sharp edges in existing Reanimated wrappers —
          not aspirational, just the bar.
        </p>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CodePreview() {
  return (
    <section className={styles.codePreview}>
      <div className={styles.codePreviewInner}>
        <div className={styles.codePreviewText}>
          <h2 className={styles.sectionTitle}>Declarative API, native feel</h2>
          <p className={styles.sectionSubtitle}>
            One <code className={styles.inlineCode}>animate</code> prop, one{' '}
            <code className={styles.inlineCode}>transition</code> prop, and a
            spring that runs on the UI thread. Per-property transitions, mount
            and exit animations, and gestures all share the same shape.
          </p>
          <Link className={styles.ctaPrimary} to="/introduction">
            Read the Docs
          </Link>
        </div>
        <div className={styles.codePreviewCode}>
          <div className={styles.codeHeader}>
            <span className={styles.codeDot} data-color="red" />
            <span className={styles.codeDot} data-color="yellow" />
            <span className={styles.codeDot} data-color="green" />
            <span className={styles.codeFilename}>FadeInCard.tsx</span>
          </div>
          <pre className={styles.codePre}>
            <code>
              <span className={styles.codeKeyword}>import</span>
              {' { Motion } '}
              <span className={styles.codeKeyword}>from</span>
              {" '@rootnative/inertia'\n\n"}
              <span className={styles.codeKeyword}>export function</span>{' '}
              <span className={styles.codeFunction}>FadeInCard</span>
              {'() {\n'}
              {'  '}
              <span className={styles.codeKeyword}>return</span>
              {' (\n'}
              {'    <'}
              <span className={styles.codeTag}>Motion.View</span>
              {'\n'}
              {'      '}
              <span className={styles.codeProp}>initial</span>
              {'={{ '}
              <span className={styles.codeProp}>opacity</span>
              {': '}
              <span className={styles.codeNumber}>0</span>
              {', '}
              <span className={styles.codeProp}>translateY</span>
              {': '}
              <span className={styles.codeNumber}>24</span>
              {' }}\n'}
              {'      '}
              <span className={styles.codeProp}>animate</span>
              {'={{ '}
              <span className={styles.codeProp}>opacity</span>
              {': '}
              <span className={styles.codeNumber}>1</span>
              {', '}
              <span className={styles.codeProp}>translateY</span>
              {': '}
              <span className={styles.codeNumber}>0</span>
              {' }}\n'}
              {'      '}
              <span className={styles.codeProp}>transition</span>
              {'={{\n'}
              {'        '}
              <span className={styles.codeProp}>opacity</span>
              {': { '}
              <span className={styles.codeProp}>type</span>
              {': '}
              <span className={styles.codeString}>&apos;timing&apos;</span>
              {', '}
              <span className={styles.codeProp}>duration</span>
              {': '}
              <span className={styles.codeNumber}>200</span>
              {' },\n'}
              {'        '}
              <span className={styles.codeProp}>translateY</span>
              {': { '}
              <span className={styles.codeProp}>type</span>
              {': '}
              <span className={styles.codeString}>&apos;spring&apos;</span>
              {', '}
              <span className={styles.codeProp}>tension</span>
              {': '}
              <span className={styles.codeNumber}>180</span>
              {' },\n'}
              {'      }}\n'}
              {'    />\n'}
              {'  )\n'}
              {'}'}
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}

function BottomCta() {
  return (
    <section className={styles.bottomCta}>
      <div className={styles.bottomCtaInner}>
        <h2 className={styles.bottomCtaTitle}>Ready to animate?</h2>
        <p className={styles.bottomCtaText}>
          Drop a Motion primitive in, hand it an{' '}
          <code className={styles.inlineCode}>animate</code> prop, and you’re
          shipping.
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.ctaPrimary} to="/introduction">
            Get Started
          </Link>
          <Link className={styles.ctaSecondary} to="/installation">
            Installation Guide
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext()

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Stats />
        <HowItWorks />
        <Features />
        <CodePreview />
        <BottomCta />
      </main>
    </Layout>
  )
}
