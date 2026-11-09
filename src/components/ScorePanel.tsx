import { renderBadge } from 'dbgn-score-badge'
import { badgeValue, barDisplay, renderShelfBadge } from '../../scripts/dbgn-display.mjs'
import type { JournalScore } from '../types'

const isOverall = (score: JournalScore) => /(?:^| · )(?:总评|个人总分|个人评分)$/.test(score.label)
const description = (score: JournalScore) => `${score.label}：${score.value}${score.scale ? ` / ${score.scale}` : ' 分'}${score.qualifier || ''}`

// DBGN徽章只支持明确的十分制单值；区间和其他量表保留原样，用进度条表达。
function badgeSvg(score: JournalScore, onSpine = false) {
  const value = badgeValue(score)
  if (value === null) return null
  const svg = onSpine ? renderShelfBadge(value) : renderBadge(value)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
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

export function caseOverallScore(scores: JournalScore[]) {
  return scores.find(score => isOverall(score) && badgeValue(score) !== null) ?? scores.find(isOverall)
}

export function ShelfScore({ score }: { score?: JournalScore }) {
  const image = score && badgeSvg(score, true)
  return <span className="spine-score" aria-hidden="true">
    {image ? <img src={image} alt="" /> : <span>
      {score ? score.value + (score.scale && score.scale !== 10 ? `/${score.scale}` : '') : '评'}
      {score?.qualifier && <small>{score.qualifier}</small>}
    </span>}
  </span>
}

export function ScorePanel({ scores }: { scores: JournalScore[] }) {
  if (!scores.length) return null
  const overall = caseOverallScore(scores)
  const image = overall && badgeSvg(overall)
  const rest = image ? scores.filter(score => score !== overall) : scores
  const evidence = [...new Set(scores.map(score => score.evidence).filter(Boolean))]
  return <div className="score-panel" aria-label="我的评分">
    <div className="score-panel-heading">我的评分</div>
    <div className="score-breakdown">
      {overall && image && <div className="score-overall">
        <img src={image} alt={description(overall)} />
        <span aria-hidden="true">{overall.label}{overall.qualifier || ''}</span>
      </div>}
      {rest.length > 0 && <div className="score-bars">{rest.map((score, index) => <ScoreBar score={score} key={`${score.label}-${index}`} />)}</div>}
    </div>
    {evidence.length > 0 && <details className="score-evidence"><summary>评分原话</summary>{evidence.map(text => <blockquote key={text}>{text}</blockquote>)}</details>}
  </div>
}
