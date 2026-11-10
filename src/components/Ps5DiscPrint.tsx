import { useState, type ReactNode } from 'react'
import discArtwork from '../../data/ps5-disc-artwork.json'
import { assetUrl } from '../lib/journal'
import type { JournalGame } from '../types'
import { PlatformBrand } from './PlatformBrand'

type DiscArtwork = {
  name: string
  tone?: string
  inkSource?: string
  scan?: { bounds: number[] }
}

const discs: Readonly<Record<string, DiscArtwork | undefined>> = discArtwork

export function Ps5DiscPrint({ game, artwork, studio }: {
  game: JournalGame
  artwork: ReactNode
  studio?: string
}) {
  const spec = discs[game.id]
  const [scanFailed, setScanFailed] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const [inkFailed, setInkFailed] = useState(false)
  const scan = !scanFailed && spec?.scan
  const title = game.originalTitle || game.title

  if (scan) {
    // The source rectangle follows the printed disc, excluding the scan's surrounding background.
    const [left, top, width, height] = scan.bounds
    return <div className="case-disc-print" data-disc-print="scan">
      <img className="case-disc-scan" src={assetUrl(`media/ps5-discs/${spec.name}-scan.webp`)} alt=""
        style={{ left: `${-100 * left / width}%`, top: `${-100 * top / height}%`, width: `${10000 / width}%`, height: `${10000 / height}%` }}
        onError={() => setScanFailed(true)} />
    </div>
  }

  return <div className="case-disc-print" data-disc-print={spec?.tone || 'dark'}>
    {spec?.inkSource && !inkFailed
      ? <img className="case-media-art" src={assetUrl(`media/ps5-discs/${spec.name}-ink.webp`)} alt=""
          onError={() => setInkFailed(true)} />
      : artwork}
    {spec && !logoFailed
      ? <img className="case-disc-title-logo" src={assetUrl(`media/ps5-discs/${spec.name}.webp`)} alt={title}
          onError={() => setLogoFailed(true)} />
      : <span className="case-disc-title">{title}</span>}
    {studio && <span className="case-disc-studio">{studio}</span>}
    <PlatformBrand platform="ps5" className="case-disc-brand" />
  </div>
}
