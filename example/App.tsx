import { useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { ColorScreen } from './screens/ColorScreen'
import { DecayScreen } from './screens/DecayScreen'
import { DragScreen } from './screens/DragScreen'
import { GestureScreen } from './screens/GestureScreen'
import { ImageScreen } from './screens/ImageScreen'
import { MotionConfigScreen } from './screens/MotionConfigScreen'
import { PanScreen } from './screens/PanScreen'
import { PerfBenchScreen } from './screens/PerfBenchScreen'
import { PresenceScreen } from './screens/PresenceScreen'
import { PressableScreen } from './screens/PressableScreen'
import { ScrollViewScreen } from './screens/ScrollViewScreen'
import { SequenceScreen } from './screens/SequenceScreen'
import { SwipeScreen } from './screens/SwipeScreen'
import { TextScreen } from './screens/TextScreen'
import { VariantsScreen } from './screens/VariantsScreen'
import { ViewScreen } from './screens/ViewScreen'

type Route =
  | 'home'
  | 'view'
  | 'text'
  | 'image'
  | 'color'
  | 'variants'
  | 'sequence'
  | 'decay'
  | 'drag'
  | 'swipe'
  | 'pan'
  | 'gesture'
  | 'pressable'
  | 'scroll-view'
  | 'presence'
  | 'motion-config'
  | 'perf-bench'

const VALID_ROUTES: ReadonlyArray<Route> = [
  'home',
  'view',
  'text',
  'image',
  'color',
  'variants',
  'sequence',
  'decay',
  'drag',
  'swipe',
  'pan',
  'gesture',
  'pressable',
  'scroll-view',
  'presence',
  'motion-config',
  'perf-bench',
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
  if (route === 'variants') return <VariantsScreen onBack={goHome} />
  if (route === 'sequence') return <SequenceScreen onBack={goHome} />
  if (route === 'decay') return <DecayScreen onBack={goHome} />
  if (route === 'drag') return <DragScreen onBack={goHome} />
  if (route === 'swipe') return <SwipeScreen onBack={goHome} />
  if (route === 'pan') return <PanScreen onBack={goHome} />
  if (route === 'gesture') return <GestureScreen onBack={goHome} />
  if (route === 'pressable') return <PressableScreen onBack={goHome} />
  if (route === 'scroll-view') return <ScrollViewScreen onBack={goHome} />
  if (route === 'presence') return <PresenceScreen onBack={goHome} />
  if (route === 'motion-config') return <MotionConfigScreen onBack={goHome} />
  if (route === 'perf-bench') return <PerfBenchScreen onBack={goHome} />

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Inertia example</Text>
      <Pressable onPress={() => setRoute('view')} style={styles.link}>
        <Text style={styles.linkLabel}>Motion.View</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('text')} style={styles.link}>
        <Text style={styles.linkLabel}>Motion.Text</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('image')} style={styles.link}>
        <Text style={styles.linkLabel}>Motion.Image</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('color')} style={styles.link}>
        <Text style={styles.linkLabel}>Color</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('variants')} style={styles.link}>
        <Text style={styles.linkLabel}>Variants</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('sequence')} style={styles.link}>
        <Text style={styles.linkLabel}>Sequences + repeat</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('decay')} style={styles.link}>
        <Text style={styles.linkLabel}>Decay</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('drag')} style={styles.link}>
        <Text style={styles.linkLabel}>Drag (gestures adapter)</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('swipe')} style={styles.link}>
        <Text style={styles.linkLabel}>Swipe (card stack)</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('pan')} style={styles.link}>
        <Text style={styles.linkLabel}>Pan (with momentum)</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('gesture')} style={styles.link}>
        <Text style={styles.linkLabel}>Gesture (pressed)</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('pressable')} style={styles.link}>
        <Text style={styles.linkLabel}>Motion.Pressable</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('scroll-view')} style={styles.link}>
        <Text style={styles.linkLabel}>Motion.ScrollView</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('presence')} style={styles.link}>
        <Text style={styles.linkLabel}>Presence</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('motion-config')} style={styles.link}>
        <Text style={styles.linkLabel}>MotionConfig (reduced motion)</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('perf-bench')} style={styles.link}>
        <Text style={styles.linkLabel}>Perf bench (FlashList)</Text>
      </Pressable>
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
    paddingTop: 96,
    paddingBottom: 48,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  link: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
  },
  linkLabel: {
    fontSize: 18,
    color: '#4f46e5',
    fontWeight: '600',
  },
})
