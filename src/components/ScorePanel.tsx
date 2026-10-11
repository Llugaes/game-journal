import { useId } from 'react'
import type { JournalScore } from '../types'

function ScoreRing({ score }: { score: JournalScore }) {
  const id = useId().replace(/:/g, '')
  const values = (score.value.match(/\d+(?:\.\d+)?/g) || []).map(Number)
  const scale = score.scale || 10
  const lower = Math.max(0, Math.min(100, Math.min(...values) / scale * 100))
  const upper = Math.max(lower, Math.min(100, Math.max(...values) / scale * 100))
  const description = `${score.label}：${score.value}${score.scale ? ` / ${score.scale}` : ' 分'}${score.qualifier || ''}`
  const arcs = (progress: number, faint = false) => <g opacity={faint ? .28 : 1}>
    {progress > 0 && <path d="M50 7 A43 43 0 0 1 50 93" pathLength="50" stroke={`url(#${id}-warm)`} strokeDasharray={`${Math.min(progress, 50)} 50`} />}
    {progress > 50 && <path d="M50 93 A43 43 0 0 1 50 7" pathLength="50" stroke={`url(#${id}-cool)`} strokeDasharray={`${progress - 50} 50`} />}
  </g>
  return <div className={`score-ring${score.value.length > 3 ? ' score-ring--wide' : ''}`} role="img" aria-label={description} data-progress={lower} data-upper-progress={upper}>
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-warm`} x1="0" y1="7" x2="0" y2="93" gradientUnits="userSpaceOnUse"><stop stopColor="var(--score-red)" /><stop offset="1" stopColor="var(--score-orange)" /></linearGradient>
        <linearGradient id={`${id}-cool`} x1="0" y1="93" x2="0" y2="7" gradientUnits="userSpaceOnUse"><stop stopColor="var(--score-orange)" /><stop offset="1" stopColor="var(--score-green)" /></linearGradient>
      </defs>
      <circle className="score-ring-track" cx="50" cy="50" r="43" />
      <g className="score-ring-arcs">{upper > lower && arcs(upper, true)}{arcs(lower)}</g>
    </svg>
    <div className="score-ring-value" aria-hidden="true"><strong>{score.value}</strong><span>{score.scale ? `/ ${score.scale}` : '分'}{score.qualifier && <em>{score.qualifier}</em>}</span></div>
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
