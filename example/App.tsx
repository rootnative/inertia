import { useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Motion } from '@rootnative/inertia'
import { ColorScreen } from './screens/ColorScreen'
import { DecayScreen } from './screens/DecayScreen'
import { DragScreen } from './screens/DragScreen'
import { GestureScreen } from './screens/GestureScreen'
import { ImageScreen } from './screens/ImageScreen'
import { LayoutScreen } from './screens/LayoutScreen'
import { LinearGradientScreen } from './screens/LinearGradientScreen'
import { MD3SwitchScreen } from './screens/MD3SwitchScreen'
import { MotionConfigScreen } from './screens/MotionConfigScreen'
import { PanScreen } from './screens/PanScreen'
import { PathMorphScreen } from './screens/PathMorphScreen'
import { PerfBenchScreen } from './screens/PerfBenchScreen'
import { PresenceScreen } from './screens/PresenceScreen'
import { PressableScreen } from './screens/PressableScreen'
import { ScrollViewScreen } from './screens/ScrollViewScreen'
import { SequenceScreen } from './screens/SequenceScreen'
import { ShadowScreen } from './screens/ShadowScreen'
import { SharedElementScreen } from './screens/SharedElementScreen'
import { SliderScreen } from './screens/SliderScreen'
import { SwipeScreen } from './screens/SwipeScreen'
import { TextScreen } from './screens/TextScreen'
import { TouchDragScreen } from './screens/TouchDragScreen'
import { TransformsScreen } from './screens/TransformsScreen'
import { UseAnimatorScreen } from './screens/UseAnimatorScreen'
import { UseColorCascadeScreen } from './screens/UseColorCascadeScreen'
import { UseColorTransitionScreen } from './screens/UseColorTransitionScreen'
import { UseInterpolatedStyleScreen } from './screens/UseInterpolatedStyleScreen'
import { UseGestureLayerScreen } from './screens/UseGestureLayerScreen'
import { UseGestureScreen } from './screens/UseGestureScreen'
import { UseMotionValueScreen } from './screens/UseMotionValueScreen'
import { UseScrollScreen } from './screens/UseScrollScreen'
import { UseShadowScreen } from './screens/UseShadowScreen'
import { VariantsScreen } from './screens/VariantsScreen'
import { ViewScreen } from './screens/ViewScreen'

type Route =
  | 'home'
  | 'view'
  | 'text'
  | 'image'
  | 'color'
  | 'transforms'
  | 'shadow'
  | 'variants'
  | 'sequence'
  | 'decay'
  | 'drag'
  | 'slider'
  | 'touch-drag'
  | 'swipe'
  | 'pan'
  | 'gesture'
  | 'use-color-transition'
  | 'use-color-cascade'
  | 'use-interpolated-style'
  | 'use-animator'
  | 'use-gesture'
  | 'use-gesture-layer'
  | 'use-motion-value'
  | 'use-scroll'
  | 'use-shadow'
  | 'pressable'
  | 'scroll-view'
  | 'presence'
  | 'linear-gradient'
  | 'path-morph'
  | 'layout'
  | 'shared-element'
  | 'md3-switch'
  | 'motion-config'
  | 'perf-bench'

const VALID_ROUTES: ReadonlyArray<Route> = [
  'home',
  'view',
  'text',
  'image',
  'color',
  'transforms',
  'shadow',
  'variants',
  'sequence',
  'decay',
  'drag',
  'slider',
  'touch-drag',
  'swipe',
  'pan',
  'gesture',
  'use-color-transition',
  'use-color-cascade',
  'use-interpolated-style',
  'use-animator',
  'use-gesture',
  'use-gesture-layer',
  'use-motion-value',
  'use-scroll',
  'use-shadow',
  'pressable',
  'scroll-view',
  'presence',
  'linear-gradient',
  'path-morph',
  'layout',
  'shared-element',
  'md3-switch',
  'motion-config',
  'perf-bench',
]

type HomeLink = {
  route: Exclude<Route, 'home'>
  label: string
  description: string
}

type HomeSection = {
  title: string
  blurb: string
  links: ReadonlyArray<HomeLink>
}

const SECTIONS: ReadonlyArray<HomeSection> = [
  {
    title: 'Primitives',
    blurb: 'The Motion.* components and the styles they animate.',
    links: [
      {
        route: 'view',
        label: 'Motion.View',
        description: 'translate, scale, rotate, size',
      },
      {
        route: 'text',
        label: 'Motion.Text',
        description: 'color and transform on text nodes',
      },
      {
        route: 'image',
        label: 'Motion.Image',
        description: 'tintColor, opacity, transforms',
      },
      {
        route: 'pressable',
        label: 'Motion.Pressable',
        description: 'press feedback + onAnimationEnd payload',
      },
      {
        route: 'scroll-view',
        label: 'Motion.ScrollView',
        description: 'animated scroll container',
      },
      {
        route: 'color',
        label: 'Color animation',
        description: 'backgroundColor, borderColor, color',
      },
      {
        route: 'transforms',
        label: 'Transforms',
        description: 'rotate, rotateX, rotateY (3D needs perspective)',
      },
      {
        route: 'shadow',
        label: 'Shadow & elevation',
        description:
          'MD3 cascade — shadowOpacity / Radius / Offset / elevation',
      },
      {
        route: 'linear-gradient',
        label: 'MotionLinearGradient',
        description: 'animatable gradient via @rootnative/inertia-gradients',
      },
      {
        route: 'path-morph',
        label: 'MotionPath',
        description: 'path morphing via @rootnative/inertia-svg',
      },
    ],
  },
  {
    title: 'Animation patterns',
    blurb: 'Declarative shapes layered on top of the primitives.',
    links: [
      {
        route: 'variants',
        label: 'Variants',
        description: 'named state-machine animations',
      },
      {
        route: 'sequence',
        label: 'Sequences & repeat',
        description: 'keyframe arrays and the unified repeat config',
      },
      {
        route: 'decay',
        label: 'Decay',
        description: 'withDecay-driven inertia',
      },
      {
        route: 'presence',
        label: 'Presence',
        description: 'mount and unmount transitions',
      },
      {
        route: 'layout',
        label: 'Layout',
        description: 'auto-layout transitions on position + size changes',
      },
      {
        route: 'shared-element',
        label: 'Shared element (layoutId)',
        description: 'FLIP transition between two views with the same layoutId',
      },
    ],
  },
  {
    title: 'Value layer',
    blurb: 'Escape-hatch hooks for driving animation outside the props.',
    links: [
      {
        route: 'use-motion-value',
        label: 'useMotionValue + useTransform',
        description: 'JS-owned shared value with derived scale and color',
      },
      {
        route: 'use-scroll',
        label: 'useScroll',
        description: 'scroll offset interpolated onto a collapsing header',
      },
      {
        route: 'use-shadow',
        label: 'useShadow',
        description: 'value-layer shadow tween driven by any progress source',
      },
      {
        route: 'use-color-transition',
        label: 'useColorTransition',
        description: 'value-layer color tween for a single color channel',
      },
      {
        route: 'use-color-cascade',
        label: 'useColorCascade',
        description: 'priority-ordered layered color crossfade over a base',
      },
      {
        route: 'use-interpolated-style',
        label: 'useInterpolatedStyle',
        description: 'one progress value mapped onto many style props at once',
      },
      {
        route: 'use-animator',
        label: 'useAnimator',
        description: 'imperative setter that resolves named transitions',
      },
    ],
  },
  {
    title: 'Gestures',
    blurb: 'The gesture prop and the optional gesture-handler adapter.',
    links: [
      {
        route: 'gesture',
        label: 'Gesture sub-states',
        description: 'pressed, focused, hovered on every primitive',
      },
      {
        route: 'use-gesture',
        label: 'useGesture',
        description: 'hook-form for siblings + multi-target compositions',
      },
      {
        route: 'use-gesture-layer',
        label: 'useGestureLayer',
        description: 'MD3 state-layer halo with clamped-max composition',
      },
      {
        route: 'md3-switch',
        label: 'MD3 Switch — ported',
        description: 'real component port: useGesture + useAnimation together',
      },
      {
        route: 'drag',
        label: 'Drag',
        description: 'continuous drag via the gestures adapter',
      },
      {
        route: 'slider',
        label: 'Slider — useDrag onRelease',
        description: 'snap-to-tick or free decay via release transitions',
      },
      {
        route: 'touch-drag',
        label: 'Touch drag — useTouchDrag',
        description: 'PanResponder-backed drag, no gesture-handler dep',
      },
      {
        route: 'swipe',
        label: 'Swipe',
        description: 'card-stack swipe gesture',
      },
      {
        route: 'pan',
        label: 'Pan',
        description: 'pan with momentum via withDecay',
      },
    ],
  },
  {
    title: 'System & performance',
    blurb: 'Accessibility, perf, and bench harnesses.',
    links: [
      {
        route: 'motion-config',
        label: 'MotionConfig',
        description: 'reduced-motion provider tied to the OS setting',
      },
      {
        route: 'perf-bench',
        label: 'Perf bench',
        description:
          'Motion.Pressable vs hand-rolled in a long list (FlatList default; FlashList swap documented)',
      },
    ],
  },
]

function readInitialRoute(): Route {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'home'
  const params = new URLSearchParams(window.location.search)
  const screen = params.get('screen')
  if (screen && (VALID_ROUTES as ReadonlyArray<string>).includes(screen)) {
    return screen as Route
  }
  return 'home'
}

export default function App() {
  const [route, setRoute] = useState<Route>(readInitialRoute)
  const goHome = () => setRoute('home')

  if (route === 'view') return <ViewScreen onBack={goHome} />
  if (route === 'text') return <TextScreen onBack={goHome} />
  if (route === 'image') return <ImageScreen onBack={goHome} />
  if (route === 'color') return <ColorScreen onBack={goHome} />
  if (route === 'transforms') return <TransformsScreen onBack={goHome} />
  if (route === 'shadow') return <ShadowScreen onBack={goHome} />
  if (route === 'variants') return <VariantsScreen onBack={goHome} />
  if (route === 'sequence') return <SequenceScreen onBack={goHome} />
  if (route === 'decay') return <DecayScreen onBack={goHome} />
  if (route === 'drag') return <DragScreen onBack={goHome} />
  if (route === 'slider') return <SliderScreen onBack={goHome} />
  if (route === 'touch-drag') return <TouchDragScreen onBack={goHome} />
  if (route === 'swipe') return <SwipeScreen onBack={goHome} />
  if (route === 'pan') return <PanScreen onBack={goHome} />
  if (route === 'gesture') return <GestureScreen onBack={goHome} />
  if (route === 'use-color-transition')
    return <UseColorTransitionScreen onBack={goHome} />
  if (route === 'use-color-cascade')
    return <UseColorCascadeScreen onBack={goHome} />
  if (route === 'use-interpolated-style')
    return <UseInterpolatedStyleScreen onBack={goHome} />
  if (route === 'use-animator') return <UseAnimatorScreen onBack={goHome} />
  if (route === 'use-gesture') return <UseGestureScreen onBack={goHome} />
  if (route === 'use-gesture-layer')
    return <UseGestureLayerScreen onBack={goHome} />
  if (route === 'use-motion-value')
    return <UseMotionValueScreen onBack={goHome} />
  if (route === 'use-scroll') return <UseScrollScreen onBack={goHome} />
  if (route === 'use-shadow') return <UseShadowScreen onBack={goHome} />
  if (route === 'pressable') return <PressableScreen onBack={goHome} />
  if (route === 'scroll-view') return <ScrollViewScreen onBack={goHome} />
  if (route === 'presence') return <PresenceScreen onBack={goHome} />
  if (route === 'linear-gradient')
    return <LinearGradientScreen onBack={goHome} />
  if (route === 'path-morph') return <PathMorphScreen onBack={goHome} />
  if (route === 'layout') return <LayoutScreen onBack={goHome} />
  if (route === 'shared-element') return <SharedElementScreen onBack={goHome} />
  if (route === 'md3-switch') return <MD3SwitchScreen onBack={goHome} />
  if (route === 'motion-config') return <MotionConfigScreen onBack={goHome} />
  if (route === 'perf-bench') return <PerfBenchScreen onBack={goHome} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="auto" />
      <Motion.View
        initial={{ opacity: 0, translateY: 16 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          opacity: { type: 'timing', duration: 320 },
          translateY: { type: 'spring', tension: 190, friction: 20 },
        }}
        style={styles.hero}
      >
        <Text style={styles.eyebrow}>@rootnative/inertia</Text>
        <Text style={styles.title}>Example gallery</Text>
        <Text style={styles.subtitle}>
          One screen per piece of the v0.1 surface. Tap through to see each
          primitive, transition, and gesture in isolation.
        </Text>
        <View style={styles.dotRow}>
          {DOTS.map((dot, i) => (
            <Motion.View
              key={dot.key}
              animate={{ translateY: [0, -7, 0] }}
              transition={{
                type: 'timing',
                duration: 520,
                delay: i * 160,
                repeat: 'infinite',
              }}
              style={[styles.dot, dot.style]}
            />
          ))}
          <Text style={styles.dotCaption}>this screen runs on Inertia too</Text>
        </View>
      </Motion.View>

      {SECTIONS.map((section, sectionIndex) => (
        <Motion.View
          key={section.title}
          initial={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            opacity: {
              type: 'timing',
              duration: 280,
              delay: 120 + sectionIndex * 90,
            },
            translateY: {
              type: 'spring',
              tension: 190,
              friction: 20,
              delay: 120 + sectionIndex * 90,
            },
          }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.countChip}>
              <Text style={styles.countChipLabel}>{section.links.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionBlurb}>{section.blurb}</Text>
          <View style={styles.linkList}>
            {section.links.map((link) => (
              <Motion.Pressable
                key={link.route}
                onPress={() => setRoute(link.route)}
                gesture={{
                  pressed: { scaleX: 0.97, scaleY: 0.97, opacity: 0.85 },
                }}
                transition={{
                  scaleX: { type: 'spring', tension: 260, friction: 18 },
                  scaleY: { type: 'spring', tension: 260, friction: 18 },
                  opacity: { type: 'timing', duration: 100 },
                }}
                style={styles.link}
              >
                <View style={styles.linkText}>
                  <Text style={styles.linkLabel}>{link.label}</Text>
                  <Text style={styles.linkDescription}>{link.description}</Text>
                </View>
                <Text style={styles.linkArrow}>→</Text>
              </Motion.Pressable>
            ))}
          </View>
        </Motion.View>
      ))}

      <Text style={styles.footer}>
        v0.0.0-alpha.0 · React Native · Reanimated 4
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 28,
  },
  hero: {
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#a5b4fc',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9ca3af',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotIndigo: {
    backgroundColor: '#818cf8',
  },
  dotGreen: {
    backgroundColor: '#34d399',
  },
  dotAmber: {
    backgroundColor: '#fbbf24',
  },
  dotCaption: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#111827',
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 11,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
  },
  countChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
  },
  sectionBlurb: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  linkList: {
    gap: 10,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkText: {
    flex: 1,
    gap: 4,
  },
  linkLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  linkDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  linkArrow: {
    fontSize: 17,
    color: '#4f46e5',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
  },
})

const DOTS = [
  { key: 'indigo', style: styles.dotIndigo },
  { key: 'green', style: styles.dotGreen },
  { key: 'amber', style: styles.dotAmber },
] as const
