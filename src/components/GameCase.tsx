import { useState } from 'react'
import type { JournalGame } from '../types'
import { assetUrl, platformOf } from '../lib/journal'
import { PlatformBrand } from './PlatformBrand'

export function GameCase({ game }: { game: JournalGame }) {
  const platform = platformOf(game)
  const media = platform === 'switch' || platform === 'switch2' || platform === 'vita' ? 'card' : 'disc'
  const [coverIndex, setCoverIndex] = useState(0)
  const covers = [...new Set([game.caseCover, game.cover])].filter((value): value is string => !!value)
  const cover = covers[coverIndex] ? assetUrl(covers[coverIndex]) : undefined

  return <div className="game-case" data-case={platform}>
    <div className="case-lid">
      <div className="case-cover" aria-hidden="true">
        <PlatformBrand platform={platform} className="case-banner" />
        {cover ? <img key={cover} src={cover} alt="" fetchPriority="high" onError={() => setCoverIndex(coverIndex + 1)} /> : <div className="case-no-art" />}
        <span className="case-cover-title">{game.title}</span>
      </div>
    </div>
    <div className="case-tray" aria-hidden="true">
      <div className={`case-media case-media--${media}`}>{cover && <img src={cover} alt="" />}</div>
    </div>
  </div>
}
