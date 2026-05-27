import { useState } from 'react'
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
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
import { UseGestureScreen } from './screens/UseGestureScreen'
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
  | 'use-gesture'
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
  'use-gesture',
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
        description: 'animatable gradient via @onlynative/inertia-gradients',
      },
      {
        route: 'path-morph',
        label: 'MotionPath',
        description: 'path morphing via @onlynative/inertia-svg',
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
  if (route === 'use-gesture') return <UseGestureScreen onBack={goHome} />
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
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>@onlynative/inertia</Text>
        <Text style={styles.title}>Example gallery</Text>
        <Text style={styles.subtitle}>
          One screen per piece of the v0.1 surface. Tap through to see each
          primitive, transition, and gesture in isolation.
        </Text>
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBlurb}>{section.blurb}</Text>
          <View style={styles.linkList}>
            {section.links.map((link) => (
              <Pressable
                key={link.route}
                onPress={() => setRoute(link.route)}
                style={({ pressed }) => [
                  styles.link,
                  pressed && styles.linkPressed,
                ]}
              >
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Text style={styles.linkDescription}>{link.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
    gap: 32,
  },
  hero: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#111827',
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    gap: 4,
  },
  linkPressed: {
    backgroundColor: '#e5e7eb',
  },
  linkLabel: {
    fontSize: 17,
    color: '#4f46e5',
    fontWeight: '600',
  },
  linkDescription: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
})
