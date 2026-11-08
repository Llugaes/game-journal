import type { JournalGame, JournalScore } from '../types'
import { assetUrl, platformOf, platforms } from '../lib/journal'
import { CaseScoreSticker } from './ScorePanel'

export function GameCase({ game, score }: { game: JournalGame; score?: JournalScore }) {
  const platform = platformOf(game)
  const media = platform === 'switch' || platform === 'switch2' || platform === 'vita' ? 'card' : 'disc'
  const cover = game.cover ? assetUrl(game.cover) : null

  return <div className="game-case" data-case={platform}>
    <div className="case-lid">
      <div className="case-cover" aria-hidden="true">
        <span className="case-banner">{platform === 'unknown' ? '游记' : platforms[platform]}</span>
        {cover ? <img src={cover} alt="" fetchPriority="high" /> : <div className="case-no-art" />}
        <span className="case-cover-title">{game.title}</span>
      </div>
    </div>
    <div className="case-tray" aria-hidden="true">
      <div className={`case-media case-media--${media}`}>{cover && <img src={cover} alt="" />}</div>
    </div>
    {score && <CaseScoreSticker score={score} />}
  </div>
}
