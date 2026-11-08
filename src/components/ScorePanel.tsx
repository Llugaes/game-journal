import { renderBadge } from 'dbgn-score-badge'
import { badgeValue, barDisplay } from '../../scripts/dbgn-display.mjs'
import type { JournalScore } from '../types'

const isOverall = (score: JournalScore) => /(?:^| · )(?:总评|个人总分|个人评分)$/.test(score.label)
const description = (score: JournalScore) => `${score.label}：${score.value}${score.scale ? ` / ${score.scale}` : ' 分'}${score.qualifier || ''}`

// DBGN徽章只支持明确的十分制单值；区间和其他量表保留原样，用进度条表达。
function badgeSvg(score: JournalScore) {
  const value = badgeValue(score)
  return value === null ? null : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderBadge(value))}`
}

function ScoreBar({ score }: { score: JournalScore }) {
  const { lower, upper, tone } = barDisplay(score)
  return <div className="score-bar-item" role="img" aria-label={description(score)}>
    <div className="score-bar-caption"><span>{score.label}</span><strong>{score.value}{score.scale ? ` / ${score.scale}` : '分'}{score.qualifier && <em>{score.qualifier}</em>}</strong></div>
    <div className={`score-bar-track score-bar-track--${tone}`} aria-hidden="true">
      {upper > lower && <span className="score-bar-range" style={{ width: `${upper * 100}%` }} />}
      <span className="score-bar-fill" style={{ width: `${lower * 100}%` }} />
    </div>
  </div>
}

export function ScorePanel({ scores, compact = false }: { scores: JournalScore[]; compact?: boolean }) {
  if (!scores.length) return null
  const overall = scores.filter(isOverall)
  const shown = compact && overall.length ? overall : scores
  const main = shown.find(score => isOverall(score) && badgeSvg(score))
  const rest = main ? shown.filter(score => score !== main) : shown
  const image = main ? badgeSvg(main) : null
  return <div className={`score-panel${compact ? ' score-panel--compact' : ''}`} aria-label="我的评分">
    <div className="score-panel-heading">我的评分</div>
    <div className="score-layout">
      {main && image && <div className="score-overall"><img src={image} alt={description(main)} /><span>{main.label}{main.qualifier && ` · ${main.qualifier}`}</span></div>}
      {rest.length > 0 && <div className="score-bars">{rest.map((score, index) => <ScoreBar score={score} key={`${score.label}-${index}`} />)}</div>}
    </div>
    {!compact && shown.some(score => score.evidence) && <details className="score-evidence"><summary>评分原话</summary>{[...new Set(shown.map(score => score.evidence).filter(Boolean))].map(text => <blockquote key={text}>{text}</blockquote>)}</details>}
  </div>
}
