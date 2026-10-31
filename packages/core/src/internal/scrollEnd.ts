import type { SharedValue } from 'react-native-reanimated'

// `useScroll` records the end of the content for each offset it returns, so a
// hook that receives only the offset can still tell an overscroll past the
// end from a scroll back.
const scrollEnds = new WeakMap<SharedValue<number>, SharedValue<number>>()

export function registerScrollEnd(
  offset: SharedValue<number>,
  end: SharedValue<number>,
): void {
  scrollEnds.set(offset, end)
}

export function scrollEndOf(
  offset: SharedValue<number>,
): SharedValue<number> | undefined {
  return scrollEnds.get(offset)
}
