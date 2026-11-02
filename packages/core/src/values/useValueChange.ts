import { useCallback, useEffect, useRef } from 'react'
import {
  useAnimatedReaction,
  useSharedValue,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

/**
 * Call a JS-thread function when a shared value changes. The reaction runs on
 * the UI thread and schedules the callback on the JS thread with the new
 * and the previous value, once per change. It does not run for the initial
 * value.
 *
 * This is the bridge from the value layer back to React state: an index that
 * a scroll offset selects, a page that a pager position crosses, a step that
 * a drag passes. Derive the value on the UI thread first, so the JS thread
 * hears one call per step and not one per frame:
 *
 * ```tsx
 * const { scrollX, onScroll } = useScroll()
 * const page = useDerivedValue(() => Math.round(scrollX.value / PAGE_WIDTH))
 * const [current, setCurrent] = useState(0)
 * useValueChange(page, setCurrent)
 * ```
 *
 * The callback can change on every render, as an inline arrow does; the hook
 * always calls the latest one. A change that lands in the same frame as a
 * render is delivered after that render commits.
 */
export function useValueChange<T>(
  value: SharedValue<T> | DerivedValue<T>,
  onChange: (current: T, previous: T) => void,
): void {
  // The worklet captures `notify`, whose identity never changes, so a new
  // `onChange` does not rebuild the reaction. `scheduleOnRN` carries a
  // function to the JS thread by reference, so the latest callback is read
  // from the ref there, not inside the worklet.
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })
  const notify = useCallback((current: T, previous: T) => {
    latest.current(current, previous)
  }, [])

  // The previous value is kept here, not taken from the reaction's second
  // argument: the Jest mock of `useAnimatedReaction` runs the reaction once
  // per render with no previous value, and the own value makes the hook
  // observable in a test the same way it runs on a device. The first run of
  // the reaction seeds it: a read of `value.value` during render would warn
  // under the Reanimated strict mode.
  const previous = useSharedValue<T | undefined>(undefined)
  const primed = useSharedValue(false)

  // No dependency list: Reanimated 4.7 warns on native when one is passed,
  // and builds the list from the worklet closure on every platform.
  useAnimatedReaction(
    () => value.value,
    (current) => {
      'worklet'
      if (!primed.value) {
        primed.value = true
        previous.value = current
        return
      }
      const last = previous.value as T
      if (last === current) return
      previous.value = current
      scheduleOnRN(notify, current, last)
    },
  )
}
