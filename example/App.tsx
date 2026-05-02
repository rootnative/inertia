import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { ImageScreen } from './screens/ImageScreen'
import { TextScreen } from './screens/TextScreen'
import { ViewScreen } from './screens/ViewScreen'

type Route = 'home' | 'view' | 'text' | 'image'

export default function App() {
  const [route, setRoute] = useState<Route>('home')
  const goHome = () => setRoute('home')

  if (route === 'view') return <ViewScreen onBack={goHome} />
  if (route === 'text') return <TextScreen onBack={goHome} />
  if (route === 'image') return <ImageScreen onBack={goHome} />

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
