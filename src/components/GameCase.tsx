import type { JournalGame } from '../types'
import { assetUrl, platformOf } from '../lib/journal'
import { studioOf } from '../lib/box-branding'
import { useCaseArtwork } from '../lib/useCaseArtwork'
import { PlatformBrand } from './PlatformBrand'

export function GameCase({ game }: { game: JournalGame }) {
  const platform = platformOf(game)
  const media = platform === 'switch' || platform === 'switch2' || platform === 'vita' ? 'card' : 'disc'
  const { src: cover, onError } = useCaseArtwork(game)
  const studio = studioOf(game)

  return <div className="game-case" data-case={platform}>
    <div className="case-lid">
      <div className="case-cover" aria-hidden="true">
        <PlatformBrand platform={platform} className="case-banner" />
        {cover ? <img key={cover} src={cover} alt="" fetchPriority="high" onError={onError} /> : <div className="case-no-art" />}
        <div className="case-cover-caption">
          <span className="case-cover-title">{game.title}</span>
          {studio?.logo && <img className="case-cover-studio" src={assetUrl(`media/marks/${studio.logo}`)} alt="" />}
        </div>
      </div>
    </div>
    <div className="case-tray" aria-hidden="true">
      <div className={`case-media case-media--${media}`}>{cover && <img src={cover} alt="" />}</div>
    </div>
  </div>
}
