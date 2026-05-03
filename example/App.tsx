import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DecayScreen } from './screens/DecayScreen'
import { GestureScreen } from './screens/GestureScreen'
import { ImageScreen } from './screens/ImageScreen'
import { PresenceScreen } from './screens/PresenceScreen'
import { PressableScreen } from './screens/PressableScreen'
import { ScrollViewScreen } from './screens/ScrollViewScreen'
import { SequenceScreen } from './screens/SequenceScreen'
import { TextScreen } from './screens/TextScreen'
import { VariantsScreen } from './screens/VariantsScreen'
import { ViewScreen } from './screens/ViewScreen'

type Route =
  | 'home'
  | 'view'
  | 'text'
  | 'image'
  | 'variants'
  | 'sequence'
  | 'decay'
  | 'gesture'
  | 'pressable'
  | 'scroll-view'
  | 'presence'

export default function App() {
  const [route, setRoute] = useState<Route>('home')
  const goHome = () => setRoute('home')

  if (route === 'view') return <ViewScreen onBack={goHome} />
  if (route === 'text') return <TextScreen onBack={goHome} />
  if (route === 'image') return <ImageScreen onBack={goHome} />
  if (route === 'variants') return <VariantsScreen onBack={goHome} />
  if (route === 'sequence') return <SequenceScreen onBack={goHome} />
  if (route === 'decay') return <DecayScreen onBack={goHome} />
  if (route === 'gesture') return <GestureScreen onBack={goHome} />
  if (route === 'pressable') return <PressableScreen onBack={goHome} />
  if (route === 'scroll-view') return <ScrollViewScreen onBack={goHome} />
  if (route === 'presence') return <PresenceScreen onBack={goHome} />

  return (
    <View style={styles.container}>
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
      <Pressable onPress={() => setRoute('variants')} style={styles.link}>
        <Text style={styles.linkLabel}>Variants</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('sequence')} style={styles.link}>
        <Text style={styles.linkLabel}>Sequences + repeat</Text>
      </Pressable>
      <Pressable onPress={() => setRoute('decay')} style={styles.link}>
        <Text style={styles.linkLabel}>Decay</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 96,
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
