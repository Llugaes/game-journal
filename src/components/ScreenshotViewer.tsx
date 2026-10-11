import { useEffect, useRef, useState } from 'react'
import type { JournalScreenshot } from '../types'
import { assetUrl } from '../lib/journal'

export function ScreenshotViewer({ shots, initialIndex, title, onClose }: { shots: JournalScreenshot[]; initialIndex: number; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex)
  const dialog = useRef<HTMLDialogElement>(null)
  const shot = shots[index]
  const move = (offset: number) => setIndex(current => (current + offset + shots.length) % shots.length)

  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }) }
  }, [])

  return <dialog ref={dialog} className="photo-viewer" aria-label={`${title} · 截图浏览`} onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}
    onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) } }}>
    <div className="viewer-shell">
      <header className="viewer-toolbar"><span>{title}</span><span aria-live="polite">{index + 1} / {shots.length}</span><button onClick={onClose} autoFocus aria-label="关闭截图预览">关闭 <span aria-hidden="true">×</span></button></header>
      <div className="viewer-image"><img src={assetUrl(shot.src)} alt={shot.caption || shot.title || `${title} 的截图 ${index + 1}`} /></div>
      <div className="viewer-controls"><button onClick={() => move(-1)} disabled={shots.length < 2}>← 上一张</button><a href={assetUrl(shot.src)} target="_blank" rel="noreferrer">打开原图 ↗</a><button onClick={() => move(1)} disabled={shots.length < 2}>下一张 →</button></div>
      <div className="viewer-caption" key={shot.id}><time>{shot.date}</time>{shot.title && <h3>{shot.title}</h3>}{shot.caption && <p>{shot.caption}</p>}{shot.comments.map(comment => <blockquote key={comment.id}>{comment.content}</blockquote>)}</div>
    </div>
  </dialog>
}
