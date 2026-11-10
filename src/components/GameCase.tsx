import { useState } from 'react'
import type { JournalGame } from '../types'
import { assetUrl, platformOf } from '../lib/journal'
import { studioOf } from '../lib/box-branding'
import { useCaseArtwork } from '../lib/useCaseArtwork'
import { PlatformBrand } from './PlatformBrand'
import { Ps5DiscPrint } from './Ps5DiscPrint'

export function GameCase({ game }: { game: JournalGame }) {
  const platform = platformOf(game)
  const nintendo = platform === 'switch' || platform === 'switch2'
  const media = nintendo || platform === 'vita' ? 'card' : 'disc'
  const stock = useCaseArtwork(game)
  const [faceFailed, setFaceFailed] = useState(false)
  const box = !faceFailed && game.boxCover ? assetUrl(game.boxCover) : undefined
  // Nintendo activity supplies a square menu icon. Keep it on the cartridge label.
  const face = box ?? (nintendo ? (!faceFailed && game.cover ? assetUrl(game.cover) : undefined) : stock.src)
  const studio = studioOf(game)
  const mediaArtwork = stock.src && <img className="case-media-art" key={stock.src} src={stock.src} alt="" onError={stock.onError} />

  return <div className="game-case" data-case={platform}>
    <div className="case-lid">
      <div className={`case-cover${box ? ' case-cover--box' : !face ? ' case-cover--text' : ''}`} aria-hidden="true">
        {!box && <PlatformBrand platform={platform} className="case-banner" />}
        {face && <img key={face} src={face} alt="" fetchPriority="high" onError={box || nintendo ? () => setFaceFailed(true) : stock.onError} />}
        {!box && <div className="case-cover-caption">
          <span className="case-cover-title">{game.title}</span>
          {studio?.logo && <img className="case-cover-studio" src={assetUrl(`media/marks/${studio.logo}`)} alt="" />}
        </div>}
      </div>
    </div>
    <div className={`case-tray case-tray--${media}`} aria-hidden="true">
      {media === 'card' && <span className="case-clips" />}
      <div className="case-recess">
        <div className={`case-media case-media--${media}`}>
          {media === 'card' && <PlatformBrand platform={platform} className="case-card-mark" />}
          {platform === 'ps5' ? <Ps5DiscPrint game={game} artwork={mediaArtwork} studio={studio?.name} /> : mediaArtwork}
        </div>
        {media === 'disc' && <span className="case-hub" />}
      </div>
    </div>
  </div>
}
