# Changelog

All notable changes to `@rootnative/inertia` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Pre-`1.0.0`, breaking changes may land in minor versions and are called out under their release.

## [Unreleased]

## [0.0.9] - 2026-08-22

### Changed

- **`useInterpolatedStyle` types its return against the map it was given, so a `style` array no longer needs a cast.** The hook returned `ReturnType<typeof useAnimatedStyle>`, which resolves to Reanimated's `DefaultStyle` — the union `ViewStyle | ImageStyle | TextStyle`. Assigning that union to a single style works, but a **style array** checks every member, and `TextStyle` is not assignable to `ViewStyle` (`cursor` is `string` there and `CursorValue` here). So the documented, dominant call shape — a transform/opacity fragment spread into `style={[base, fragment]}` — was a type error, and consumers cast it away.

  The return is now `InterpolatedStyle<K>`, computed from the map's own keys: view keys satisfy `StyleProp<ViewStyle>`, text-metric keys (`fontSize`, `lineHeight`, `letterSpacing`) satisfy `StyleProp<TextStyle>`, `tintColor` satisfies `StyleProp<ImageStyle>`, and transform keys collapse into the single `transform` array the worklet emits. The narrowing is exact rather than permissive — a text-only fragment is still rejected from a `ViewStyle` slot, pinned in both directions by `__type-tests__/interpolated-style.test-d.tsx`.

  Types only: no runtime change, and no bundle-size change. Removing a now-unnecessary `as ViewStyle` is safe; the cast remains harmless if left in place. `InterpolatedStyle` is exported from the root barrel.

  Surfaced by the `reelist` validation consumer, and it is the independent-application half of the loop reporting its first library defect.

## [0.0.8] - 2026-08-16

### Added

- **`<Stagger>` — parent-owned delays for a cascading list entrance.** Wrapping a list in `<Stagger interval={60}>` assigns each child a delay of `delay + position * interval` milliseconds, applied to the declarative animations (the `initial` → `animate` mount and any later `animate` change) of every `Motion.*` primitive in that child's subtree. No child computes `index * ms` itself, which removes the two structural problems of the per-child form: a list that filters or reorders staggers from stale indices, and the cascade cannot be turned off in one place. Positions re-derive from render order every render, `from="last"` reverses the cascade, and `enabled={false}` zeroes every delay — pass `enabled={revealed}` and the reveal cascades while the hide animates together.

  The delay wraps each key's fully resolved animation exactly once, on the JS thread — never merged into the base transition config, which a keyframe sequence would re-apply per step. It composes with the child's own `transition.delay` (the two add). It deliberately does not delay `gesture` sub-state feedback (press feedback delayed by list position reads as lag), `<Presence>` exits (a positional delay holds `safeToRemove` — and therefore the unmount — hostage to the cascade), or reduced-motion snaps (a deferred snap is still choreography).

  `<Stagger>` renders no host view — only per-child context providers, so it composes with any layout. Custom animated components built on `resolveTransition` / `resolveAnimatableValue` can participate through the new `useStaggerDelay()` hook, and `applyDelay(animation, ms)` is now exported alongside the other transition utilities.

  Surfaced by the `purrfect-match` validation consumer (DX feedback entry 13), generalized here per the audience-and-scope rule: the shape follows Framer Motion's `staggerChildren` / `delayChildren`, renamed to `interval` / `delay` because the component's own name already says "children".

- **`buildReleaseAnimation` accepts a settle callback.** A third, optional `callback` parameter — the same `(finished) => void` shape Reanimated's `with*` factories accept — is forwarded to the underlying `withSpring` / `withTiming` / `withDecay` call and fires once when the animation settles. For `no-animation` it fires synchronously with `finished: true`, since a direct assignment has no settle point of its own. Existing two-argument call sites are unchanged.

  This is the primitive behind `useSwipe`'s new `onSwipeEnd` in `@rootnative/inertia-gestures`: a gesture-release worklet can now learn when its release animation has finished without polling a shared value. The `AnimationCallback` type is exported from the root barrel alongside it.

## [0.0.7] - 2026-08-14

### Added

- **`Motion.FlatList` — a virtualized animated scroller.** Reachable from the `Motion` namespace, as the named export `MotionFlatList`, and through the new `@rootnative/inertia/flat-list` subpath.

  It closes a gap that forced a real architectural compromise on consumers: `useScroll`'s `onScroll` is a worklet handler, which only functions on a Reanimated animated component, and until now the only animated scroller was `Motion.ScrollView` — which mounts every row. A long list could virtualize (a plain `FlatList`, no animation) or animate from scroll position (`Motion.ScrollView`, every row mounted), not both. Nothing about `useScroll` was ever specific to `ScrollView`; the primitive was simply missing.

  Animation props apply to the scroll **container**, matching `Motion.ScrollView`. Rows animate via a `Motion.*` primitive inside `renderItem`, which is what makes scroll-driven row effects work. The `layout` prop animates the list frame; Reanimated's `itemLayoutAnimation` is forwarded untouched for per-row layout animation.

  Typing keeps both inference paths that a naive wrapper loses. `createMotionComponent<C>` returns a non-generic component, so `data` / `renderItem` would collapse to `any` — the item type is restored with a generic call signature, the same fix Reanimated applies to its own `Animated.FlatList`. The variants map is a **second** generic on that one signature, so `animate="typo"` against a `variants` prop stays a compile error here exactly as on every other primitive; declaring only the item generic would have silently dropped that narrowing on this primitive alone.

  Built on Reanimated's `Animated.FlatList` rather than RN's `FlatList`, which supplies the `CellRendererComponent` injection behind `itemLayoutAnimation` and defaults `scrollEventThrottle` to 1 — so a `useScroll` handler reports every frame with no extra prop.

  **Bundle cost: 9.10 kB for the new subpath, +0.04 kB on the root entry**, and nothing on existing subpaths. The cheapest primitive added so far: it is almost entirely the shared factory, adding no parser, no interpolation, and no worklet branch.

### Fixed

- **`gesture={{ pressed: … }}` now responds to a mouse on web.** On any primitive that isn't a `Pressable` — a plain `Motion.View`, `Motion.Text`, `Motion.Image` — the pressed layer never engaged under a desktop click. It has been inert on web since the `gesture` prop shipped in `0.0.1`.

  The cause is which events the layer was wired to. `pressed` was driven by `onTouchStart` / `onTouchEnd` plus `onPressIn` / `onPressOut`. The press pair only exists on `Pressable`-style hosts, and react-native-web forwards `onTouchStart` to the DOM as a real `touchstart` listener — which a mouse never fires. So `Motion.Pressable` worked (it has the press path) while every other primitive had no live path at all for a pointer that isn't a finger.

  The layer now also listens on `onPointerDown` / `onPointerUp` / `onPointerCancel`, which react-native-web forwards and which cover mouse, pen, and touch alike. `pressed` means "any pointer" on every platform. `onPointerCancel` is included so a browser-initiated takeover (a scroll or drag beginning mid-press) releases the layer instead of leaving it stuck on.

  A web touch emits both `touchstart` and `pointerdown`; both set the same flag to the same value, so the overlap is idempotent rather than a double-toggle. React Native has no pointer props, so the added handlers are inert on iOS and Android. `hovered`, `focused`, and `focusVisible` were never affected — their events are forwarded on every primitive.

  **Bundle cost: +0.06 kB (+0.7%) per primitive subpath**, 9.05 → 9.11 kB brotlied, +0.04 kB on the root entry. No `size-limit` cap moved. Handlers are still mounted only when `pressed` is declared, so the gesture-less path is unchanged.

### Internal

- **`pressed-modalities.test.tsx` asserts each input modality separately.** Every pre-existing gesture test fires `pressIn` — the one path that already worked on every platform — which is why a six-release gap in the touch and pointer paths went unseen. The new file drives touch, pointer, and press independently, plus the cancel path, the both-events-at-once overlap, composition with a consumer's own pointer handlers, and the guarantee that no pointer handler is mounted when `pressed` isn't declared.

## [0.0.6] - 2026-08-08

**Defect release: two animations that never ran.** Both trace to one assumption about what Reanimated accepts as an animatable value, and both were hidden by the same thing — `type: 'timing'` snaps to its target when the duration elapses, so a total interpolation failure still produced the right end state. `animate={{ boxShadow }}` was inert under the default spring; every colour key was inert when it rested at its default, which is the far more common path. Neither is caught by a mocked test suite, so this release also adds a test file that runs Reanimated's real drivers.

### Fixed

- **`animate={{ boxShadow }}` now animates under `type: 'spring'`** — the library default, and the documented recommendation, so `animate={{ boxShadow }}` with no `transition` prop at all was the broken path. The key worked under `type: 'timing'` and was inert under spring, from its introduction in `0.0.4` until now.

  The cause was the shape of the value handed to Reanimated. Its animation drivers walk a structured value by dispatching on each leaf's runtime shape, but the two container branches are **not symmetrical** (`animation/util.ts`): `objectOnStart` re-assigns the decorated `onStart` onto each child, so a child that is itself an object or a colour is dispatched again, recursively — while `arrayOnStart` does not, handing every element straight to the scalar spring/timing maths. `boxShadow`'s payload was an array of layer objects, so each layer was evaluated as `object - object` → `NaN`.

  Why only spring broke: `withTiming` snaps to its target once the duration elapses, whatever the interpolation produced along the way, so the shadow still arrived and the fault stayed hidden. `withSpring` decides it has settled via `isAnimationTerminatingCalculation`, and every comparison against `NaN` is false — so the animation never finished, the shared value held `'[object Object]NaN'` indefinitely, `onAnimationEnd` never fired, and the frame loop never stopped.

  The payload is now keyed by index (`{ 0: layer, 1: layer }`), which routes it down the object branch where the recursion works and each layer's colour reaches the RGBA-channel path. The change is internal: `animate={{ boxShadow }}` accepts the same CSS string and `BoxShadowValue[]` forms, endpoint padding is unchanged, and `onAnimationEnd`'s `value` is still reported as a layer list.

- **Colour keys can now animate away from their resting default.** `'transparent'` is the one CSS colour name Reanimated's `isColor()` rejects — its colour table maps the keyword to `undefined` while every other name maps to a packed integer. A value that fails that gate but is still a string falls to the prefix-number-suffix branch built for values like `'100%'`, producing `'transparentNaN'` and, under spring, never settling.

  `'transparent'` was Inertia's resting default for `backgroundColor`, `borderColor`, `color`, `tintColor`, and `shadowColor`, so `<Motion.View animate={{ backgroundColor: '#4f46e5' }} />` on an element with no static colour and no `initial` never animated. All five defaults are now `'rgba(0, 0, 0, 0)'` — the identical colour, recognised by the gate — and the keyword is rewritten to it wherever it would enter a colour slot: `initial`, `animate` (including keyframe sequences and `{ to }` steps), and the static `style` a never-driven key rests at.

  Only values handed to `withSpring` / `withTiming` are affected. `interpolateColor` parses the keyword correctly, so the `gesture` cascade, the `layoutId` style carry, and `useShadow` were never affected and keep the consumer's own spelling.

  **Visible difference:** a colour key resting at its default now renders `'rgba(0, 0, 0, 0)'` where it used to render `'transparent'`. Same colour, but a snapshot test asserting the literal string will need updating.

- **`boxShadow`'s transparent padding layer** — added when the two endpoints have different layer counts — used the same keyword, so a single padding layer was enough to hang a whole shadow animation. It is now `'rgba(0, 0, 0, 0)'`.

### Added

- **`TRANSPARENT`** — the colour a custom animated component should seed a colour shared value with when it has no other source. Exported alongside `resolveTransition` and the other building blocks for custom components, because the obvious choice (`'transparent'`) is the one spelling Reanimated cannot animate away from, and nothing about the failure points at the cause.

**Bundle cost: +0.13 kB (+1.5%) per primitive subpath**, 8.92 → 9.05 kB brotlied, +0.18 kB on the root entry (12.10 → 12.28 kB). No `size-limit` cap moved. The payload reshape is close to free — one index-keying pass on the JS thread and one loop in the worklet, replacing an array that crossed over by reference — and most of the delta is the colour normalization, which has to run on four separate paths into a slot.

### Internal

- **`reanimated-drivers.test.ts` runs Reanimated's real animation drivers**, imported by deep path, instead of the static mock the rest of the suite uses. Both defects above were invisible to that mock — `withSpring` and `withTiming` are the identity function there, so the payload Inertia produced looked correct in every assertion while being unanimatable in fact. The new file drives Reanimated's own `onStart` / `onFrame` protocol (the one its `valueSetter` runs) and asserts that leaves converge, that a spring settles, and that mid-flight frames carry numbers. It also pins the two upstream behaviours the fixes work around, so a Reanimated upgrade that changes either fails loudly rather than silently leaving dead workarounds behind.

## [0.0.5] - 2026-07-31

**Correctness release for the `animate` type surface.** The 40 layout and text-metric style keys that typechecked but were silently dropped at runtime now either animate or fail to compile. No API removals; the type narrowing is technically breaking for code that passed a never-driven key, but that code was already a no-op.

### Added

- **Layout numerics are animatable.** Forty keys join the `animate` surface, all riding the existing generic numeric path — one shared value each, resolved on the JS thread, emitted through the same branch as `opacity`:

  | Group             | Keys                                                                                                            |
  | ----------------- | --------------------------------------------------------------------------------------------------------------- |
  | Per-corner radius | `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomLeftRadius`, `borderBottomRightRadius`              |
  | Border width      | `borderWidth`, `borderTopWidth`, `borderRightWidth`, `borderBottomWidth`, `borderLeftWidth`                     |
  | Absolute inset    | `top`, `right`, `bottom`, `left`                                                                                |
  | Padding           | `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `paddingHorizontal`, `paddingVertical` |
  | Margin            | `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`, `marginHorizontal`, `marginVertical`        |
  | Flex sizing       | `flex`, `flexGrow`, `flexShrink`                                                                                |
  | Gap               | `gap`, `rowGap`, `columnGap`                                                                                    |
  | Stacking          | `zIndex`                                                                                                        |
  | Text metrics      | `fontSize`, `letterSpacing`, `lineHeight` — `Motion.Text` only, since they live on `TextStyle`                  |

  Every one of these previously **typechecked and then did nothing**: `AnimateStyle<C>` mapped over the component's entire inferred style, so `animate={{ paddingTop: 40 }}` compiled cleanly, allocated nothing, and never appeared in the rendered style. The `Motion.Text` case was the sharpest — the docs told consumers to hand-roll `useAnimatedStyle` for `fontSize` while the type-test asserted `fontSize` was accepted, so the two halves of the contract actively disagreed. Sequences, `{ to }` step objects, per-property transitions, `gesture` sub-states, `exit`, variants, and the `layoutId` resting logic all work on the new keys with no special-casing.

  **These drive real layout, so they reflow every frame.** Prefer `scale` / `translate*` for pure motion — those composite without touching layout. Reach for these when the layout genuinely changes: a drawer sliding via `left`, a card squaring off one corner as it expands, a pane resize via `flex`. The Fabric jitter caveat that has always applied to `width` / `height` on non-`flex: 1` containers applies here too.

  **Resting values behave as they have since `0.0.3`.** A key declared only in a `gesture` sub-state, an `exit` target, or a non-active variant joins the active set, so the worklet emits it every frame including at rest — and since the animated style merges _after_ `style`, a non-identity resting default would silently stomp the consumer's layout. The existing style-scan handles this: such a key rests at whatever `StyleSheet.flatten(style)` says, falling back to the type default only when the style is silent. All 40 defaults are `0`, which is RN's own unset value for each, so a key that does fall back lands where the element already was. Guarded by four dedicated cases in `animatable-keys.test.tsx` alongside the existing `style-resting.test.tsx`.

  **Bundle cost: +0.11 kB (+1.3%) per primitive subpath**, 8.80 → 8.91 kB brotlied, +0.08 kB on the root entry. No `size-limit` cap moved. Nearly free because the factory's per-key machinery was already generic: the only structural change was replacing 23 hand-written `useSharedValue` calls in `useAnimatableSharedValues` with a loop over `ALL_KEYS`, which offset almost the entire cost of the 40 new table entries. Hook order stays stable because `ALL_KEYS` is a module-level `as const` whose length is fixed at module evaluation.

### Changed

- **`animate` now rejects style keys Inertia doesn't drive, at compile time.** `AnimateStyle<C>` is narrowed to an intersection of the component's style keys and the set the runtime actually animates, so `animate={{ alignItems: 'center' }}` is a type error instead of a silent no-op. This restores the library's headline differentiator — the first row of the sharp-edges table promises that wrong props error rather than going unnoticed — which the previous whole-style mapping had quietly broken for every non-animatable key.

  **Technically breaking, practically not:** code that passed one of these keys stops compiling, but it was already doing nothing at runtime, so nothing that worked before stops working. Fixing a break means either deleting the key or moving it to the static `style` prop, which is where it belonged.

  Two categories are rejected on purpose. **Enum-valued keys** (`position`, `overflow`, `alignItems`, `flexDirection`, `display`) have no interpolable midpoint. **`minWidth` / `maxWidth` / `minHeight` / `maxHeight` / `aspectRatio`** are excluded for a subtler reason worth recording: their unset state isn't a number, so there is no value they could rest at when declared only in a `gesture` sub-state or a non-active variant — any numeric default would change the layout the instant the key activated, which is exactly the `0.0.3` resting-value regression. Animate `width` / `height` instead, or drop to the value-layer hooks. Per-primitive gating is unchanged and still enforced: `tintColor` stays Image-only, and the text metrics are rejected on `Motion.View` and `Motion.Image`.

  `AnimatableStyleKey` (the new type) and `ALL_KEYS` (the runtime array) are necessarily separate declarations — one is a type, the other a value in a module that imports it — so the pairing is pinned by tests on both sides: `__type-tests__/animate-keys.test-d.tsx` (23 compile-time assertions) proves the type accepts and rejects the right keys, and `__tests__/animatable-keys.test.tsx` (17 cases) proves every accepted key reaches the rendered style. A key added to one but not the other fails one of the two.

### Fixed

- **Reduced motion is no longer bypassed by a sequence step that declares its own `type`.** `<MotionConfig reducedMotion="always">` (and the `'user'` default under an OS reduce-motion setting) swaps every per-key transition for `{ type: 'no-animation' }`, but `mergeTransition` in `resolveSequence.ts` let a step-declared `type` win outright over the base whenever the two differed — so `animate={{ translateX: [0, { to: 100, type: 'timing', duration: 200 }, 0] }}` still called `withTiming` for a user who had asked the OS for no motion. Both sequence arrays and the single `{ to, ...override }` form were affected, for every step type.

  A `no-animation` base is now treated as a **ceiling rather than a default**: it short-circuits the merge before the step-type rule runs. That rule is unchanged and still correct for ordinary bases — mixing a spring base's `tension` into a timing override produces garbage, which is why it exists.

  This contradicted the contract stated in `createMotionComponent.tsx`, which had promised since the gate was written that reduced motion "overrides every per-key transition (and any nested sequence-step transition)". The code was the half that was wrong.

  **Why it went unnoticed:** `reduced-motion.test.tsx` asserted only on per-key transitions, where the base reaches Reanimated unmodified — sequence steps were the one path that could talk its way past the gate, and nothing covered them. Three cases now do, including a `reducedMotion="never"` positive control so a future regression can't pass by asserting nothing. Dropping a step `delay` alongside the type matches how the rest of the resolver already treats this transition type (`delayOf` and `repeatOf` both return `undefined` for `no-animation`), so a snap is never deferred or repeated anywhere in the library.

  Surfaced by the `@rootnative/ui` validation consumer, whose `LinearProgress` / `CircularProgress` both use an inline-typed snap-back step inside an infinite keyframe loop. Their local workaround — not mounting the `Motion.View` at all under reduced motion — remains the better render and is unaffected. No bundle-size change (one early-return branch; primitives stay at 8.9 kB against the 10.3 kB cap).

## [0.0.4] - 2026-07-29

**Feature release.** The three deferred items the `0.0.3` audit left on the roadmap land together: `boxShadow` joins the declarative `animate` surface, and `layoutId` shared-element transitions gain window-coordinate measurement and a style carry. No breaking changes; the three adapters are lockstep-bumped with no runtime changes of their own.

### Added

- **`boxShadow` is now an animatable property on the `animate` surface.** The cross-platform CSS shadow form joins the declarative surface alongside the native `shadow*` keys, accepting either a CSS string (`'0px 4px 8px rgba(0,0,0,0.3)'` — the shape design systems store elevation tokens in) or React Native's own `BoxShadowValue[]`, whose lengths may be numbers or px strings. The key was already accepted at compile time and silently ignored at runtime, because `AnimateStyle<C>` maps over every key of the inferred style and RN's `ViewStyle` has carried `boxShadow` since 0.76 — so this makes an accepted key work rather than widening the type surface. Endpoints are normalized on the JS thread once per change and padded to a common layer count, so **layer counts may differ between `initial` and `animate`**: the short side gains transparent zero layers and the surplus layer fades rather than popping, matching CSS transition semantics. Every length and color interpolates per layer. `inset` is carried as a **static** per-layer flag rather than interpolated (there is no meaningful midpoint between an inner and an outer shadow, and a boolean driven down Reanimated's numeric path yields `0` mid-flight — a number where native expects a boolean); both endpoints may use it freely, but a layer that is `inset` on one side only throws, as it already did in `useShadow`. Only px and unitless lengths are accepted; `em` / `%` / `rem` throw rather than animating from a `NaN`. New `BoxShadowInput` type exported from the root barrel. Guarded by `boxShadow.test.tsx` (22 cases) and seven compile-time assertions in `animate.test-d.tsx`.

  Worth knowing if you go looking at the implementation: the target has to reach Reanimated as the **structured array**, not the CSS string. `withSpring` / `withTiming` dispatch on the runtime shape of the value, and a box-shadow string is not a color, so it lands in the prefix-number-suffix branch built for values like `'100%'` and would pull a single number out of a four-value shadow. The array form instead recurses into each layer and animates every leaf. All string parsing therefore happens on the JS thread, and the worklet only emits what the slot already holds — no frame-time string or structural work.

  Two deliberate limits, both matching the single-value contract `shadowOffset` has carried since `0.0.1`. **Sequences are unsupported on this key**: `boxShadow: [a, b]` means one two-layer shadow, not a two-step keyframe sequence, because nothing distinguishes the two shapes structurally and the array form is the one RN itself uses. Per-property transitions are unaffected. **`boxShadow` is not accepted inside `gesture` sub-states**: compositing a layer stack through the priority cascade would put per-layer, per-field interpolation on the UI thread for every primitive whether or not it animates a shadow. It dev-warns and is ignored — drive it from `animate` (optionally via a variant keyed off the same state), or interpolate it yourself with `useShadow`. Animating `boxShadow` alongside the native `shadow*` keys on one element also dev-warns: that applies two shadow systems at once and whichever the view resolves last wins.

  **Bundle cost, measured:** +1.61 kB (+24%) per primitive subpath — 6.63 kB → 8.24 kB brotlied — and +0.82 kB on the root entry, which was already carrying the shadow parser via `useShadow`. The `size-limit` caps were raised deliberately to keep the ~25% band the config has always claimed; the full accounting, including the alternatives that were measured and rejected, is in `.size-limit.cjs`.

- **`layoutId` shared-element transitions now carry style across, not just the rect.** A hero card that changes background colour, corner radius, or opacity between screens used to snap on those props while its frame animated — the most visible half of the transition arriving instantly. The source element's values for `opacity`, `borderRadius`, `backgroundColor`, `borderColor`, `color`, and `tintColor` are now snapshotted alongside its rect and crossfaded out over the same transition that drives the FLIP, so the arriving element starts wearing its counterpart's style and ends wearing its own. Nothing to configure: it rides the existing `layoutId` + `transition` props.

  **Which keys carry, and why not more.** Transform keys are deliberately excluded — they are the FLIP's job, and carrying them too would apply the same displacement twice. So is `shadowColor`, despite being a colour key: crossfading one of the four native shadow props over geometry that snapped looks worse than letting the whole shadow snap together. There is no configuration surface for the list and no `layoutStyles` prop; if you need a key that isn't carried, drive it from `animate` on both sides.

  **A key only participates when the element already has a value for it** — from `animate` / `initial` / a variant / `gesture`, or from the static `style`, read through `StyleSheet.flatten` the same way undriven resting values are. Values are never invented: activating a key the element says nothing about would rest it at the generic type default, and for `color` on a `Motion.Text` that inherits its colour from a parent, that default is `'transparent'` — invisible text on an element the consumer only asked to move. This is the same failure mode as the `0.0.3` resting-value regression, approached from the other side. A key the source carried but the target has no value for is ignored, and vice versa.

  **A still-mounted source is read live**, for the same reason its rect is re-measured: values move without a layout pass (an animation settling, a theme swap), so the stored snapshot is a floor rather than the truth. Once the source has unmounted, the snapshot taken at release is all that remains. Reduced motion and `transition={{ type: 'no-animation' }}` snap, matching the rect path — and a source and target in mismatched coordinate spaces skip the style carry along with the FLIP, since half a shared-element transition reads as a glitch rather than as graceful degradation. On the mount that consumes a source, the carry composites _above_ the base value, so it overrides `initial` for the carried keys on that mount.

  Cheap by construction: one progress shared value drives however many keys are carried, and the blend reuses the worklet's existing lerp / `interpolateColor` branches — the same ones the `gesture` cascade uses — sitting one priority above every gesture layer. At rest the pair is `(null, 0)`, so a primitive that isn't mid-transition pays a single comparison. **Bundle cost: +0.56 kB (+6.8%) per primitive subpath**, 8.24 → 8.80 kB brotlied, +0.59 kB root; the `size-limit` caps did not move. Workspace-internal API changes (none of it is exported from the package root): `consumeLayout` returns `{ rect, remeasure?, styles?, readStyles? }`, `registerLayout` takes an optional style reader, `releaseLayout` takes an optional snapshot, and `useSharedLayout` returns a `carry` binding alongside `flip`. Guarded by 16 new cases in `sharedLayout.test.tsx`.

### Changed

- **`layoutId` shared-element rects are now measured in window coordinates.** Rects came from `onLayout`, which reports **parent-relative** coordinates, so a source and target sitting under containers at different screen offsets produced a FLIP short by exactly that offset — the element flew in from the wrong place. Rects are now measured with `measureInWindow` on the host node, which is what makes nested-parent setups line up. Where a synchronous measurement isn't available the parent-relative rect is used instead, so behavior is unchanged rather than broken; each entry records which space it is in, and a source and target that ended up in _different_ spaces skip the animation rather than play a wrong one.

  **Synchronous or not at all**, and this is a design decision rather than a limitation. `measureInWindow` resolves synchronously on Fabric (a JSI call), asynchronously on the legacy architecture (over the bridge), and **never** on a detached node — `ReactFabricHostComponent.measureInWindow` looks the node up and simply returns when it's missing, and the Jest host mock behaves the same way. Awaiting the callback would put the same element in window space on one platform and parent space on another, and since the two aren't comparable, a source stored in one and a target measured in the other would silently cancel the transition. Reading the result synchronously or treating it as unavailable keeps the space coherent: fixed on Fabric, unchanged on legacy, never intermittent. A late callback is deliberately dropped. A measurement that is zero-sized or non-finite is also rejected — trusting it would fling the element in from the top-left corner, which is worse than not animating.

  **A still-mounted source is re-measured when the target lays out.** This is the other half of the change, and without it window coordinates would have been a net regression. `onLayout` does not fire when an _ancestor_ scrolls, so a stored window rect drifts as the user scrolls a list while a parent-relative rect would have stayed valid — meaning the most common shared-element case (scroll a list of photos, tap one) would have been offset by the scroll distance. A registry entry now carries a re-measure hook while its owner is mounted, which a stack navigator's outgoing screen still is at the moment the incoming one lays out. `releaseLayout` drops the hook, since a detached node measures to nothing. Remaining caveat: if the navigator has already begun translating the outgoing screen, the re-measurement catches it mid-transition — bounded by how far the transition has progressed, far smaller than an unbounded scroll offset.

  Also fixed while here: **the four FLIP shared values now cancel on unmount.** The `0.0.2` unmount-cancel pass covered the value-layer hooks and the factory's per-key values but missed these. Workspace-internal API changes (none of it is exported from the package root): `SharedRect` gains a required `space` field, `consumeLayout` returns a source object instead of a bare rect, `registerLayout` takes an optional re-measure hook, and a new `__setSharedLayoutMeasurer` test hook joins `__setSharedLayoutClock`. Guarded by 12 new cases in `sharedLayout.test.tsx` (49 in total for this release, counting the style carry below).

## [0.0.3] - 2026-07-25

### Fixed

- **Properties mentioned only by `gesture` / `exit` / a non-current variant no longer stomp the static `style`.** A key touched by any of those joins the animated key set — the worklet has to know about it so the layer or branch can drive it later — but until something actually drove it, it rested at a generic default and the animated style, which merges _after_ `style`, silently overrode the element's own stylesheet. `<Motion.View style={styles.field} gesture={{ focused: { borderColor: '#4f46e5' } }} />` rendered `borderColor: 'transparent'` on the very first frame, before any interaction; `exit={{ width: 0 }}` collapsed the element to zero width while it was still on screen; a `width` present in one variant branch collapsed the element whenever a different branch was active. Affected every property whose default isn't an identity — `width`, `height`, `borderRadius`, `shadowOpacity`, `shadowRadius`, `elevation`, `shadowOffset`, and all five color keys. Transforms and `opacity` were unaffected, which is why this survived so long: their defaults (`0` / `1`) happen to be no-ops. Undriven properties now rest at the value the static `style` sets — read through `StyleSheet.flatten`, so style arrays and registered stylesheet IDs resolve, transform entries are read out of the `transform` array, `shadowOffset` decomposes into both axes, and unit-suffixed rotations (`'45deg'`, `'0.5rad'`) convert to the plain degrees the shared value holds — falling back to the type default only when the style is silent too. Gesture layers now blend from that style-derived base and return to it on release. The base also tracks a `style` that changes after mount (a theme swap no longer gets pinned to the value captured at mount). Non-numeric style values such as `width: '100%'` are deliberately not seeded into numeric slots, since a later `withTiming` can't interpolate them. Values a record has already driven are untouched: switching to a variant branch that omits a key still leaves it where the previous branch put it. Guarded by `style-resting.test.tsx` (18 cases).

- **`<Presence>` children now animate out in place instead of jumping to the end of their siblings.** The render list was built as "every present entry, then every exiting entry". React reconciles that array by key, so appending physically moved the node: removing the middle of a three-row list rendered `a, c, b` and the departing row visibly jumped to the bottom before it had finished fading. Absolutely-positioned overlays — popovers, sheets, toasts, the cases `<Presence>` gets used for most and the ones the existing tests covered — never showed it; every list and column did. Exiting entries are now spliced back in at the position they held, anchored immediately after their nearest surviving predecessor (or at the front if there isn't one), so adjacent departures keep their relative order and siblings added or reordered mid-exit are placed around them. `<Presence>` remembers the full previous render order, including entries that were already exiting, since an exiting child is by definition absent from `children`. Note for anyone touching this code: the ordering pass has to read the exiting map that the _current_ render computed, not the `useState` value — on the render that first detects a departure the state update hasn't applied yet, and using the stale map drops the child from the remembered order entirely on the following render, losing the exit animation rather than merely misplacing it. Guarded by `Presence.order.test.tsx` (12 cases; 7 fail against the previous implementation).

- **An endless (`repeat: 'infinite'`) animation no longer blocks completion counters.** A callback is only promoted to the terminal `'animation'` phase once `iteration >= totalIterations - 1`, which is unreachable against `Infinity`. Two counters were gated behind that check and both broke in the presence of an endless animation. **(1) The transform group** — a multi-axis transform coalesces its terminal callbacks into one `onAnimationEnd({ key: 'transform' })`, counting the participating axes and firing when the last settles. An endless axis pinned that count above zero forever, so `animate={{ translateX: 100, translateY: 50 }}` with `transition={{ translateX: { repeat: 'infinite' }, translateY: {} }}` settled `translateY`, decremented the counter, and fired **nothing** — the completion was silently swallowed. Endless axes are now excluded from the group, so the finite axes still report; when every transform axis is endless no terminal callback fires at all, which is correct since nothing finishes. **(2) `<Presence>`'s settle counter** — the same unreachable check gated `safeToRemove`, so an endless exit animation left the child **mounted forever**. A top-level `transition={{ repeat: 'infinite' }}` is inherited by `exit`, so a pulsing element inside `<Presence>` would never unmount — a permanent leak, not just a missed callback. Exit keys that can never settle are no longer counted: finite keys still gate the unmount, and if every exiting property is endless the child is released immediately. Scope the repeat to one property (`transition={{ opacity: { repeat: 'infinite' } }}`) when you want a loop _and_ a normal exit. Guarded by `endless-repeat.test.tsx` (8 cases; 4 fail against the previous implementation).

- **`useColorCascade` now notices when a layer's `progress` shared value is swapped.** The layer chain is memoized on a structural signature — key, base colour, layer count, layer colours — which can't contain the shared values themselves because they're objects, and they were excluded from change detection entirely. Swapping _which_ value drives a layer while its colour stayed the same therefore did nothing: the worklet went on reading the old shared value, and driving the one no longer referenced by any layer still moved the colour. A conditionally-sourced progress (`{ progress: isError ? errorSpring : hoverSpring, color }`) silently animated off the wrong input. Shared-value references are now compared directly and the array is rebuilt only when one actually differs, so the swap rewires the worklet while a fresh-but-equal `layers` literal still produces no new UI-thread closure.

- **`useAnimator()` is now identity-stable by construction, as documented.** Its JSDoc, the hooks reference, and the `0.0.2` changelog all promised an identity-stable setter safe to drop into memoized handlers, and all three explained it as reading the registry "live inside the body" — but the implementation listed `[registry, shouldReduceMotion]` as `useCallback` dependencies, so a provider republishing its `transitions` map or a reduced-motion change handed back a new function and churned every handler built on it. It stayed stable only by accident of `<MotionConfig>` memoizing. Both values now genuinely live in refs read at call time, which also makes writes resolve against the registry current _when the event fires_ rather than the one captured at render.

- **The `layoutId` measure registry now evicts expired entries.** Rects only ever left the module-level map through `consumeLayout` / `peekSharedLayout`, so a `layoutId` that unmounted and was never remounted kept its entry for the lifetime of the process. Harmless for a handful of hero images; a slow leak for per-item ids in a long-lived list (`layoutId={`photo-${item.id}`}`), where the release is never consumed. Writes now run an expiry sweep, amortized to at most one full scan per TTL window so a burst of layout events doesn't become a burst of scans. Sweeping a still-mounted element's entry is safe — it re-registers on its next `onLayout`, and unmount re-publishes the rect with a fresh TTL either way.

## [0.0.2] - 2026-07-24

### Added

- **`useAnimator()` — imperative writes that resolve named transitions and respect reduced motion.** The imperative counterpart to `useAnimation`: returns an identity-stable `(value, to, transition?)` setter to call from event handlers (hover-in, focus, press) rather than from an effect. It closes the two footguns of the hand-written `value.value = resolveTransition(config, to)` escape hatch: a registered `TransitionName` now resolves through the nearest `<MotionConfig transitions>` (a bare `resolveTransition` can't reach the context registry, so imperative call sites otherwise rebuild configs the provider already owns — surfaced by the RootNative UI Slider rebuilding `state-hover` / `state-focus` by hand), and the write routes through the same `no-animation` reduced-motion downgrade `useAnimation` applies (raw `resolveTransition` writes silently bypass `<MotionConfig reducedMotion>` — a correctness fix). Not a new animation API — the hooks-layer equivalent of `useMotionValue` + `resolveTransition`, minus the footguns. New `Animator` type exported from the root barrel.
- **`useColorCascade(rest, layers, options?)` — priority-ordered layered color crossfade.** Composites a stack of color layers over a base `rest` color; each layer carries its own `progress` shared value and blends toward its color as that progress rises, later layers winning over earlier ones (the values-layer form of the `gesture` prop's fixed-priority cascade, Decision 5). Exactly equivalent to the hand-chained nested-`interpolateColor` shape `focus(error(hover(rest)))`, collapsed into one hook and one worklet — the shape the RootNative UI TextField hand-writes three times (label color, filled indicator, outlined border). `options.key` reuses `ColorStyleKey` (default `backgroundColor`). Memoized on a colors+key signature so an equal-but-fresh `layers` literal produces no new UI-thread closure. Color-only by design; cascade a numeric key via `useInterpolatedStyle` + `useTransform` max. `useColorTransition` remains the single-layer fast path. New `ColorCascadeLayer` / `UseColorCascadeOptions` types exported from the root barrel.

### Changed

- **A prop-less `Motion.*` primitive is now a zero-cost plain host.** An instance carrying none of the animation-driving props (`initial` / `animate` / `exit` / `transition` / `variants` / `controller` / `gesture` / `layout` / `layoutId` / `onAnimationEnd`) previously still allocated the full animated body — ~25 per-key shared values, four gesture-progress shared values, gesture `useState`s, and a `useAnimatedStyle` worklet — every render. It now renders straight through `Animated.createAnimatedComponent(Component)` with `style` / `ref` / `onLayout` forwarded and no animation allocation, so a prop-less `Motion.View` is a genuine drop-in for `Animated.View` when hosting an animated-style fragment from `useColorTransition` / `useShadow` / `useInterpolatedStyle` / `useColorCascade` (no `/reanimated` import needed — closes proposal item 5). The plain host stays `<Presence>`-aware (it self-removes on exit via a context read + unmount effect, no worklet). Adding an animation prop opts the instance back into the full body; because the two paths are distinct component types, crossing that boundary remounts the element (give it a stable `key` if the remount matters). New guard test (`plain-host.test.tsx`) pins that a prop-less primitive calls neither `useSharedValue` nor `useAnimatedStyle`.
- **Value hooks and the `Motion.*` factory now cancel in-flight animations on unmount.** `useMotionValue`, `useSpring`, `useBooleanSpring`, and `useAnimation` — and every per-key / gesture-layer shared value inside a `Motion.*` primitive — register an unmount cleanup that calls `cancelAnimation` on the shared value they own. Previously a mid-flight (or `repeat: 'infinite'`) `withSpring` / `withTiming` / `withDecay` kept ticking its worklet for frames after the owning component was gone; consumers who cared had to import `cancelAnimation` from the `/reanimated` interop subpath and hand-write the effect (surfaced by the RootNative UI Slider's 22-line 8-value teardown). The shared values are identity-stable and component-owned, so cancelling on unmount is always safe. `cancelAnimation` stays exported from the interop subpath for _mid-life_ cancellation — this change only covers the unmount case. Behavior change (no API change).

## [0.0.1] - 2026-07-23

**First stable release.** Graduates the `0.0.0-alpha.x` line, absorbing Milestones 1–3 in a single tag: the declarative core (primitives, per-property transitions, sequences/keyframes, unified `repeat`, variants, `gesture` prop, `<Presence>`, `<MotionConfig>` with reduced-motion + named transitions), the value-layer hooks, the `layout` prop and rect-only `layoutId` shared-element transitions, and the `inertia-gestures` / `inertia-gradients` / `inertia-svg` adapter packages (released in lockstep). See the alpha entries below for the per-change history.

### Added

- **`useShadow` now interpolates CSS `boxShadow`.** The classic `shadow*`/`elevation` keys never reach the web renderer, so a `useShadow` elevation crossfade silently dropped its shadow on web — the platform where hover, its most common driver, matters most (gap surfaced by the RootNative UI Card migration). `ShadowConfig` gains `boxShadow?: string | BoxShadowLayer[]`: pass the CSS string form design systems store elevation tokens in (px lengths only; parsed once on the JS thread, `cubicBezier`-style — malformed tokens throw at setup rather than warning) or structured layers mirroring RN's `BoxShadowValue`. Multi-layer shadows interpolate per layer with CSS-transition padding semantics (shorter side padded with invisible layers; a genuine `inset` mismatch throws); blur clamps at 0 under springy overshoot. Emitted as a `boxShadow` style string — passed through as CSS by react-native-web and rendered natively on RN 0.76+ new architecture; keep `shadow*`/`elevation` alongside it for old-arch native. New `BoxShadowLayer` type exported from the root.

## [0.0.0-alpha.5] - 2026-07-21

### Changed

- **Non-worklet transformers and easings now dev-warn.** `useTransform`'s transformer overload and custom `timing.easing` functions must be worklets (`'worklet'` directive as the first statement). The previous "plain functions are auto-wrapped" promise was unfulfillable: the directive-wrapped fallback closes over the opaque function reference, not the shared values read inside it, so Reanimated cannot extract dependencies (a `useTransform` derived value silently only refreshed on React re-renders — found via a frozen TextField label float in the UI library) and native builds reject the plain function when the closure is serialized to the UI thread. The fallback wrapper remains as a web-only best effort, but both sites now `console.warn` once in dev (suppressed under Jest, where the shared stubs report every function as non-worklet). Docs (`transitions.md`, `layout.md`, `api/hooks.md`) and docstrings corrected to state the real contract.

## [0.0.0-alpha.4] - 2026-07-21

### Fixed

- **First mouse click after page load no longer draws a focus ring** (web). The `focusVisibility` input-modality listeners attached lazily on the first `isFocusVisible()` call — which happens _during_ the focus dispatch of that first click, after its `mousedown` had already passed unobserved — leaving the default `'keyboard'` modality and misclassifying the pointer interaction as keyboard focus. The listeners now install eagerly at module import (the lazy path remains as a safety net for environments where `document` appears after import).

## [0.0.0-alpha.3] - 2026-07-21

### Fixed

- **Named transitions resolve correctly across subpath entries.** `splitting: false` in the tsup config made every dist entry inline its own copy of `MotionConfigContext`, so the provider (root entry) and consumers (e.g. the `/gesture-layer` subpath) held different React contexts and every registered name silently fell back to the default spring. Dist now builds with code splitting so the context module is shared.

## [0.0.0-alpha.2] - 2026-07-20

### Added

- **`useGestureLayer` returns per-state progress** — the result now carries `states: GestureLayerProgress`, the five 0↔1 progress shared values behind the composed style (`hovered` / `focused` / `focusVisible` / `pressed` from the underlying `useGesture`, plus the hook-owned `disabled` progress). Lets styles derived from the same gesture wiring — an elevation crossfade via `useShadow({ from, to, progress: states.hovered })`, an icon tint — reuse the hook's progress values instead of duplicating the cascade through a parallel `useGesture` call. Purely additive; the exposed shared values are identity-stable across renders and are the same objects the worklet reads (treat as read-only — the handlers own the writes). The `GestureLayerProgress` type is exported from the `/gesture-layer` subpath.

### Changed

- Published bundles no longer include sourcemaps, and the `__type-tests__` directories are excluded from the npm package (packaging-only; no runtime change).

## [0.0.0-alpha.1] - 2026-07-19

### Added

- **Named transition registry** — `<MotionConfig transitions={{ name: TransitionConfig }}>` registers named transitions for the subtree; the name is accepted everywhere a `TransitionConfig` is: the `transition` prop (top-level, per-property, per gesture layer), the `layout` prop, and `useAnimation` / `useSpring` / `useBooleanSpring` / `useGesture` / `useGestureLayer`. Names resolve at the nearest provider; nested providers merge with child-overrides-per-name; unknown names warn in dev and fall back to the default spring. No presets ship — names are consumer vocabulary. New exports: `useNamedTransitions()`, `resolveNamedTransition()`, and the `TransitionName` / `TransitionInput` / `NamedTransitions` / `RegisteredTransitions` types (`RegisteredTransitions` is the augmentation point for compile-time-typed names).

- **`cubicBezier()` easing helper** — builds a `timing.easing` value from cubic-bezier control points as four numbers, as a W3C CSS `cubic-bezier(x1, y1, x2, y2)` string, or as a CSS keyword (`'linear'` / `'ease'` / `'ease-in'` / `'ease-out'` / `'ease-in-out'`). Makes CSS-format design-token easings directly consumable (pair with the named-transition registry). Invalid input throws: `x1` / `x2` must be finite and within `[0, 1]`; `step-*` keywords and the CSS `linear(...)` function are unsupported. The `EasingFunction` / `EasingFunctionFactory` / `EasingInput` types are now exported from the root barrel.

### Changed

- **Nested `<MotionConfig>` now inherits `reducedMotion`** from its ancestor when the prop is omitted (previously an inner provider silently reset the subtree to the `'user'` default). A transitions-only inner provider no longer clobbers an outer `reducedMotion="never"` / `"always"`.

## 0.0.0-alpha.0

_No git tag was cut for this release; the published artifact is on npm as [`@rootnative/inertia@0.0.0-alpha.0`](https://www.npmjs.com/package/@rootnative/inertia/v/0.0.0-alpha.0). Unlinked here for that reason — every other heading resolves to a real tag._

Initial alpha publish. The full initial surface is in place; APIs are still subject to change before the stability lock at `1.0.0`.

### Added

- **Primitives** — `Motion.View`, `Motion.Text`, `Motion.Image`, `Motion.Pressable`, `Motion.ScrollView` with per-primitive style inference (no shared `ViewStyle & TextStyle & ImageStyle` fallback).
- **Subpath imports** — `@rootnative/inertia/view`, `/text`, `/image`, `/pressable`, `/scroll-view` for per-primitive tree-shaking. Bundle-size baselines recorded via `size-limit`.
- **Transitions** — `spring` (default, react-spring vocabulary `tension`/`friction`/`mass`/`velocity`), `timing` (with auto-worklet-wrapped easing functions), `decay`, `no-animation`. Per-property `transition` shape takes precedence over top-level.
- **Sequences and keyframes** — `animate={{ x: [0, 100, 0] }}` and `[{ to, ...override }]` step shape with per-step transition overrides.
- **Repeat config** — unified `repeat: number | 'infinite' | { count, alternate }` shape; `alternate` defaults to `true`.
- **Variants** — `variants={{ open, closed }}` + `animate="open"` props; `useVariants` hook returning `{ current, transitionTo, subscribe }` for programmatic flows; `controller` prop wires the hook back to the component.
- **Gestures** — single `gesture` prop on every primitive: `pressed`, `focused`, `hovered` (web) sub-states. Pressable-based, zero overhead when omitted.
- **`<Presence>`** — mount/unmount transitions on top of Reanimated's `entering` / `exiting`. Exiting children automatically receive `pointerEvents: 'none'`.
- **`<MotionConfig reducedMotion>`** — `'user' | 'never' | 'always'` provider with `'user'` as the default. `useMotionConfig` and `useShouldReduceMotion` exposed for custom integrations.
- **`onAnimationEnd`** — `{ key, finished, value, target, phase, step, iteration }` payload. Transform-group keys (`translateX`/`translateY`, `scaleX`/`scaleY`) coalesce so a single `translate` step fires once, not once per axis.
- **Stable worklets, JS-thread resolver** — animate/transition objects compile to baked `withSpring` / `withTiming` / `withDecay` calls on the JS thread. Worklet bodies never iterate `Object.keys(...)` at frame time, and re-renders with unchanged values produce zero new UI-thread closures (regression-tested).
- **`createMotionComponent<C>()`** — public factory for custom primitives, with style inference from `C`'s `style` prop.
- **Docs** — Docusaurus site at `rootnative.github.io/inertia`; `llms.txt` and `llms-full.txt` shipped both on the docs site and in the npm tarball.

### Known limitations

- SVG path morphing, gradient interpolation, and shared-element transitions across screens are out of scope until `0.2.x` / `1.x` per the roadmap.
- `react-native-gesture-handler` integration (drag, pan, swipe sub-states) lands in `0.2` via the optional `@rootnative/inertia-gestures` adapter.

[unreleased]: https://github.com/rootnative/inertia/compare/core+gestures+gradients+svg@0.0.9...HEAD
[0.0.9]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.9
[0.0.8]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.8
[0.0.7]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.7
[0.0.6]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.6
[0.0.5]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.5
[0.0.4]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.4
[0.0.3]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.3
[0.0.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.2
[0.0.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.1
[0.0.0-alpha.5]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.5
[0.0.0-alpha.4]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.4
[0.0.0-alpha.3]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.3
[0.0.0-alpha.2]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.2
[0.0.0-alpha.1]: https://github.com/rootnative/inertia/releases/tag/core+gestures+gradients+svg@0.0.0-alpha.1
