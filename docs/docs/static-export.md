---
sidebar_position: 12
description: Why a pre-rendered page can ship blank, and the one style block that stops it.
---

# Static export & SSR

A static export renders your tree on a server and writes the result into HTML. `Motion.*` renders at its `initial` values, so an element that animates in from `opacity: 0` ships as:

```html
<div data-entrance="true" style="opacity: 0; transform: translateY(24px)">
  …
</div>
```

That is correct while the bundle loads and takes over. It is a **blank page** for a visitor whose bundle fails, who is on a connection that drops it, or who blocks scripts.

:::warning This failure is invisible to every automated check

The build succeeds. The HTML is valid. The page is perfect in development, where the bundle always runs. Nothing errors, nothing warns, and no test fails — the content is simply gone for a visitor with no JavaScript. It is visible only to a human who loads the page with scripts off.

:::

## The fix: one style block

Add this to your HTML shell. For Expo Router that is `app/+html.tsx`.

```tsx title="app/+html.tsx"
import {
  entranceGuardCss,
  entranceGuardNoscriptCss,
} from '@rootnative/inertia/static-export'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <style dangerouslySetInnerHTML={{ __html: entranceGuardCss() }} />
        <noscript>
          <style
            dangerouslySetInnerHTML={{ __html: entranceGuardNoscriptCss }}
          />
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**There is nothing to add per element.** Every `Motion.*` with an `initial` prop marks itself on web, and stands the guard down when it mounts.

## How it works

Three parts, and the middle one is the part that is easy to get wrong:

1. **The marker.** On web, a `Motion.*` carrying `initial` renders `data-entrance="true"`. Those are exactly the elements a pre-render bakes at a pre-animation value.
2. **The signal.** The first `Motion.*` to mount stamps `data-inertia-ready` on `<html>`. The guard's selector is `html:not([data-inertia-ready])`, so the moment the bundle runs, the fallback stops applying.
3. **The fallback.** After a timeout (4 seconds by default) any still-marked element is revealed with `opacity: 1; transform: none`.

Step 2 is not optional. A CSS animation outranks an inline style, so a timeout with no ready signal would fire on pages where the animation ran perfectly — revealing every element still _deliberately_ hidden: an exit mid-flight, a gesture layer resting at zero opacity, a closed variant. The guard has to tell "the JavaScript never arrived" from "the JavaScript decided this should be hidden".

The `<noscript>` block skips the timeout entirely. With no script there is nothing to wait for, so holding the visitor for four seconds would be pointless. Its rules carry `!important` because the export writes each resting value into the element's own `style` attribute, which outranks a plain stylesheet rule.

## Tuning the timeout

```tsx
entranceGuardCss({ timeoutMs: 2500 })
```

The value is a judgement about the slowest connection worth serving, not a performance target. Too short and a slow-but-working page flashes its content into place before the animation runs. Too long and a visitor whose bundle failed stares at nothing.

## Limits, stated plainly

- **The fallback reveals to `opacity: 1` and `transform: none`** — the resting state of the overwhelming majority of entrances. An element that animates _to_ a non-default opacity or a permanent transform is revealed at the default instead of its real target. That is a deliberate trade: the fallback's only job is to make the content readable, and it runs only on a page where no animation will ever run.
- **The guard covers `initial`, not every way an element can be hidden.** An element hidden by app state that the server rendered as hidden is your app's concern, not the animation library's.
- **It is web-only.** On native there is no pre-render, no marker is written, and the module is inert.

## If you already hand-rolled this

Earlier versions of this library shipped no guard, so apps built their own — typically a `dataSet` constant applied by hand to every hidden element, plus matching CSS in the shell. Two things are worth doing when you adopt this:

1. **Delete the per-element marker and the convention that went with it.** The point of the built-in version is that forgetting it is no longer possible.
2. **Check the attribute name.** A hand-rolled guard that also used `data-entrance` keeps working; one that used a different name reveals nothing until the CSS is swapped for `entranceGuardCss()`.

## Exports

| Export                     | Type                                         | Notes                                                                         |
| -------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `entranceGuardCss`         | `(options?: EntranceGuardOptions) => string` | The keyframes and the ready-gated rule. `options.timeoutMs` defaults to 4000. |
| `entranceGuardNoscriptCss` | `string`                                     | Reveals every marked element at once, for a `<noscript>` block.               |
| `ENTRANCE_ATTRIBUTE`       | `'data-entrance'`                            | The marker, for a custom stylesheet or a test.                                |
| `READY_ATTRIBUTE`          | `'data-inertia-ready'`                       | The signal, same.                                                             |

All from `@rootnative/inertia/static-export`, a subpath the root entry does not re-export — it is read once by an HTML shell, so an app that never pre-renders carries none of it.
