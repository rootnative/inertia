import React from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './RunnableExample.module.css'

type Props = {
  screen?: string
  height?: number
  title?: string
}

export default function RunnableExample({
  screen,
  height = 640,
  title = 'Inertia runnable example',
}: Props): React.JSX.Element {
  const base = useBaseUrl('/example/')
  const src = screen ? `${base}?screen=${encodeURIComponent(screen)}` : base
  const heightStyle = { height: `${height}px` } as const

  return (
    <div className={styles.frame} style={heightStyle}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className={styles.iframe}
        allow="accelerometer; gyroscope"
      />
    </div>
  )
}
