import React from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './RunnableExample.module.css'

type Props = {
  screen?: string
  height?: number
  title?: string
}

const FRAME_HEADER_PX = 38

export default function RunnableExample({
  screen,
  height = 640,
  title = 'Inertia runnable example',
}: Props): React.JSX.Element {
  const base = useBaseUrl('/example/')
  const src = screen ? `${base}?screen=${encodeURIComponent(screen)}` : base
  const frameStyle = { height: `${height + FRAME_HEADER_PX}px` } as const
  const label = screen ? `example / ${screen}` : 'example'

  return (
    <div className={styles.frame} style={frameStyle}>
      <div className={styles.chrome}>
        <span className={styles.dot} data-color="r" />
        <span className={styles.dot} data-color="y" />
        <span className={styles.dot} data-color="g" />
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.iframeWrap}>
        <iframe
          src={src}
          title={title}
          loading="lazy"
          className={styles.iframe}
          allow="accelerometer; gyroscope"
        />
      </div>
    </div>
  )
}
