/**
 * Phase-1 acceptance: per-primitive style inference must reject keys that
 * don't exist on the underlying component's style prop, at compile time.
 *
 * These assertions run as part of `tsc --noEmit` (typecheck CI step). They
 * are not Jest tests — Jest's Babel transform strips `@ts-expect-error`,
 * so a runtime check can't enforce a compile-time gate. If any
 * `@ts-expect-error` here becomes unused (i.e. the line below it stops
 * being a type error), tsc fails with "Unused '@ts-expect-error'
 * directive" and Phase-1 has regressed.
 *
 * The file is excluded from the tsup build via the explicit entry list in
 * tsup.config.ts, and from Jest via the `__tests__`-only testMatch glob.
 *
 * We assert against `AnimateStyle<...>` directly (rather than mounting JSX)
 * because Prettier reflows multi-line JSX, which would push the actual
 * error onto a different line than the `@ts-expect-error` directive.
 * Direct value-to-type assignment lines stay one line, regardless of
 * Prettier print width.
 */

import type { ComponentProps } from 'react'
import type { Image, Pressable, ScrollView, Text, View } from 'react-native'
import type { AnimateStyle } from '../types'

type ViewAnimate = AnimateStyle<ComponentProps<typeof View>>
type TextAnimate = AnimateStyle<ComponentProps<typeof Text>>
type ImageAnimate = AnimateStyle<ComponentProps<typeof Image>>
type PressableAnimate = AnimateStyle<ComponentProps<typeof Pressable>>
type ScrollViewAnimate = AnimateStyle<ComponentProps<typeof ScrollView>>

// ─── Motion.View / ViewStyle ────────────────────────────────────────────────

const _viewAccepts: ViewAnimate = { opacity: 1, translateX: 10, scale: 1.1 }
const _viewAcceptsRotate: ViewAnimate = { rotate: 45, rotateX: 30, rotateY: 60 }
// @ts-expect-error rotate is a numeric degree value; strings like '45deg' aren't accepted
const _viewRejectsRotateString: ViewAnimate = { rotate: '45deg' }
// @ts-expect-error tintColor is ImageStyle-only and must be rejected on View
const _viewRejectsTintColor: ViewAnimate = { tintColor: '#0a84ff' }
// @ts-expect-error fontSize is TextStyle-only and must be rejected on View
const _viewRejectsFontSize: ViewAnimate = { fontSize: 20 }
// @ts-expect-error completely unknown keys must be rejected
const _viewRejectsUnknown: ViewAnimate = { nonsenseKey: 1 }

// ─── Motion.Text / TextStyle ────────────────────────────────────────────────

const _textAccepts: TextAnimate = { opacity: 1, color: '#000', fontSize: 16 }
// @ts-expect-error tintColor is ImageStyle-only and must be rejected on Text
const _textRejectsTintColor: TextAnimate = { tintColor: '#0a84ff' }

// ─── Motion.Image / ImageStyle ──────────────────────────────────────────────

const _imageAccepts: ImageAnimate = { tintColor: '#0a84ff', opacity: 0.5 }
// @ts-expect-error fontSize is TextStyle-only and must be rejected on Image
const _imageRejectsFontSize: ImageAnimate = { fontSize: 20 }

// ─── Motion.Pressable / Motion.ScrollView ───────────────────────────────────
//
// Both wrap View internally; their style surface is ViewStyle. Same rule as
// Motion.View — no tintColor. Pressable's `style` is a union with a
// `(state) => StyleProp<ViewStyle>` callback; the `_StyleValue` helper in
// `types.ts` strips the function variant so inference stays tight.

const _pressableAccepts: PressableAnimate = { opacity: 1, scale: 0.96 }
// @ts-expect-error tintColor is ImageStyle-only and must be rejected on Pressable
const _pressableRejectsTintColor: PressableAnimate = { tintColor: '#0a84ff' }

const _scrollViewAccepts: ScrollViewAnimate = { opacity: 1, translateY: 10 }
// @ts-expect-error tintColor is ImageStyle-only and must be rejected on ScrollView
const _scrollViewRejectsTintColor: ScrollViewAnimate = { tintColor: '#0a84ff' }

// Silence "declared but never read" — these exist purely as type assertions.
export type _PhaseOneTypeAssertions = [
  typeof _viewAccepts,
  typeof _viewAcceptsRotate,
  typeof _viewRejectsRotateString,
  typeof _viewRejectsTintColor,
  typeof _viewRejectsFontSize,
  typeof _viewRejectsUnknown,
  typeof _textAccepts,
  typeof _textRejectsTintColor,
  typeof _imageAccepts,
  typeof _imageRejectsFontSize,
  typeof _pressableAccepts,
  typeof _pressableRejectsTintColor,
  typeof _scrollViewAccepts,
  typeof _scrollViewRejectsTintColor,
]
