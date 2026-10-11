import { scoreDisplay } from '../../scripts/score-display.mjs'
import type { JournalScore } from '../types'

function ScoreRing({ score }: { score: JournalScore }) {
  const { lower, upper, color } = scoreDisplay(score.value, score.scale)
  const description = `${score.label}：${score.value}${score.scale ? ` / ${score.scale}` : ' 分'}${score.qualifier || ''}`
  const arc = (progress: number, faint = false) => progress > 0 && <circle cx="50" cy="50" r="43" pathLength="100" stroke={color} opacity={faint ? .25 : 1} strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 50 50)" />
  return <div className={`score-ring${score.value.length > 3 ? ' score-ring--wide' : ''}`} role="img" aria-label={description} data-progress={lower * 100} data-upper-progress={upper * 100}>
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle className="score-ring-track" cx="50" cy="50" r="43" />
      <g className="score-ring-arcs">{upper > lower && arc(upper, true)}{arc(lower)}</g>
    </svg>
    <div className="score-ring-value" aria-hidden="true"><strong style={{ color }}>{score.value}</strong><span>{score.scale ? `/ ${score.scale}` : '分'}{score.qualifier && <em>{score.qualifier}</em>}</span></div>
  </div>
}

export function ScorePanel({ scores, compact = false }: { scores: JournalScore[]; compact?: boolean }) {
  if (!scores.length) return null
  const overall = scores.filter(score => ['总评', '个人总分', '个人评分'].includes(score.label))
  const shown = compact && overall.length ? overall : scores
  return <div className={`score-panel${compact ? ' score-panel--compact' : ''}`} aria-label="我的评分">
    <div className="score-panel-heading">我的评分</div>
    <div className="score-list">{shown.map((score, index) => <div className="score-item" key={`${score.label}-${index}`}>
      <ScoreRing score={score} />
      <span className="score-label">{score.label}</span>
    </div>)}</div>
    {!compact && shown.some(score => score.evidence) && <details className="score-evidence"><summary>评分原话</summary>{[...new Set(shown.map(score => score.evidence).filter(Boolean))].map(text => <blockquote key={text}>{text}</blockquote>)}</details>}
  </div>
}
