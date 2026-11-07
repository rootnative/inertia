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

That is correct while the bundle loads and takes over. It's a **blank page** for a visitor whose bundle fails, whose connection drops it, or who blocks scripts.

:::warning No automated check sees this failure

The build succeeds. The HTML is valid. The page is perfect in development, where the bundle always runs. Nothing errors, nothing warns, and no test fails. The content is gone for a visitor with no JavaScript. Only a human who loads the page with scripts off sees it.

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

**You add nothing per element.** Every `Motion.*` with an `initial` prop marks itself on web, and it switches the guard off when it mounts.

## How it works

Three parts. The middle one is easy to get wrong:

1. **The marker.** On web, a `Motion.*` with `initial` renders `data-entrance="true"`. Those are exactly the elements that a pre-render writes at a pre-animation value.
2. **The signal.** The first `Motion.*` to mount stamps `data-inertia-ready` on `<html>`. The selector of the guard is `html:not([data-inertia-ready])`, so the fallback stops the moment the bundle runs.
3. **The fallback.** After a timeout (4 seconds by default), the guard reveals every element that still has the marker, with `opacity: 1; transform: none`.

Step 2 is not optional. A CSS animation outranks an inline style, so a timeout with no ready signal would fire on a page where the animation ran perfectly. It would reveal every element that is still hidden _on purpose_: an exit in flight, a gesture layer at zero opacity, a closed variant. The guard has to tell "the JavaScript never arrived" from "the JavaScript decided that this element is hidden".

The `<noscript>` block skips the timeout. With no script, there is nothing to wait for, so a four-second wait would have no point. Its rules carry `!important`, because the export writes each resting value into the own `style` attribute of the element, which outranks a plain stylesheet rule.

## Tuning the timeout

```tsx
entranceGuardCss({ timeoutMs: 2500 })
```

The value is a judgement about the slowest connection that you want to serve, not a performance target. If it's too short, a slow but working page flashes its content into place before the animation runs. If it's too long, a visitor whose bundle failed sees nothing for a long time.

## Limits

- **The fallback reveals to `opacity: 1` and `transform: none`.** That is the resting state of almost every entrance. An element that animates _to_ a non-default opacity or a permanent transform appears at the default instead of its real target. That is a deliberate trade. The only job of the fallback is to make the content readable, and it runs only on a page where no animation will ever run.
- **The guard covers `initial`, not every way to hide an element.** An element that the server rendered as hidden because of app state is the concern of your app, not of the animation library.
- **It's web-only.** On native there is no pre-render, Inertia writes no marker, and the module is inert.

## If you already wrote this yourself

Earlier versions of this library shipped no guard, so apps built their own: usually a `dataSet` constant applied by hand to every hidden element, plus matching CSS in the shell. Do two things when you adopt the built-in guard:

1. **Delete the per-element marker and the convention that went with it.** The point of the built-in version is that you can't forget it.
2. **Check the attribute name.** A hand-written guard that also used `data-entrance` keeps working. One that used a different name reveals nothing until you swap the CSS for `entranceGuardCss()`.

## Exports

| Export                     | Type                                         | Notes                                                                         |
| -------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `entranceGuardCss`         | `(options?: EntranceGuardOptions) => string` | The keyframes and the ready-gated rule. `options.timeoutMs` defaults to 4000. |
| `entranceGuardNoscriptCss` | `string`                                     | Reveals every marked element at once, for a `<noscript>` block.               |
| `ENTRANCE_ATTRIBUTE`       | `'data-entrance'`                            | The marker, for a custom stylesheet or a test.                                |
| `READY_ATTRIBUTE`          | `'data-inertia-ready'`                       | The signal, same.                                                             |

All of them come from `@rootnative/inertia/static-export`. The root entry doesn't re-export that subpath. An HTML shell reads it once, so an app that never pre-renders carries none of it.
