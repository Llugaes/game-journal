import type { JournalScore } from '../types'

export function ScorePanel({ scores, compact = false }: { scores: JournalScore[]; compact?: boolean }) {
  if (!scores.length) return null
  const overall = scores.filter(score => ['总评', '个人总分', '个人评分'].includes(score.label))
  const shown = compact && overall.length ? overall : scores
  return <div className={`score-panel${compact ? ' score-panel--compact' : ''}`} aria-label="我的评分">
    <div className="score-panel-heading">我的评分</div>
    <div className="score-list">{shown.map((score, index) => <div className="score-item" key={`${score.label}-${index}`}>
      <div className={`score-number${score.value.length > 4 ? ' score-number--wide' : ''}`}>
        <strong>{score.value}</strong><span>{score.scale ? `/ ${score.scale}` : '分'}{score.qualifier && <em>{score.qualifier}</em>}</span>
      </div>
      <span className="score-label">{score.label}</span>
    </div>)}</div>
    {!compact && shown.some(score => score.evidence) && <details className="score-evidence"><summary>评分原话</summary>{[...new Set(shown.map(score => score.evidence).filter(Boolean))].map(text => <blockquote key={text}>{text}</blockquote>)}</details>}
  </div>
}
