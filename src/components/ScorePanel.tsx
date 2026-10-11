import { useId } from 'react'
import { scoreDisplay } from '../../scripts/score-display.mjs'
import type { JournalScore } from '../types'

function ScoreRing({ score }: { score: JournalScore }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { lower, upper, color, highlight, shadow, tone } = scoreDisplay(score.value, score.scale)
  const description = `${score.label}：${score.value}${score.scale ? ` / ${score.scale}` : ' 分'}${score.qualifier || ''}`
  const arc = (progress: number, faint = false) => progress > 0 && <circle cx="50" cy="50" r="43" pathLength="100" stroke={faint ? color : `url(#${id}-finish)`} opacity={faint ? .22 : 1} strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 50 50)" />
  return <div className={`score-ring${score.value.length > 3 ? ' score-ring--wide' : ''}`} role="img" aria-label={description} data-tone={tone} data-progress={lower * 100} data-upper-progress={upper * 100}>
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-finish`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={highlight} /><stop offset=".28" stopColor={color} /><stop offset=".72" stopColor={shadow} /><stop offset="1" stopColor={color} /></linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".6" /><stop offset=".5" stopColor="#fff" stopOpacity=".04" /><stop offset="1" stopColor="#fff" stopOpacity=".2" /></linearGradient>
      </defs>
      <circle className="score-ring-face" cx="50" cy="50" r="37" />
      <circle className="score-ring-track" cx="50" cy="50" r="43" />
      <g className="score-ring-arcs">{upper > lower && arc(upper, true)}{arc(lower)}</g>
      {lower > 0 && <circle className="score-ring-glint" cx="50" cy="50" r="43" pathLength="100" stroke={`url(#${id}-glint)`} strokeDasharray={`${lower * 100} 100`} transform="translate(0 -.8) rotate(-90 50 50)" />}
    </svg>
    <div className="score-ring-value" aria-hidden="true"><strong style={{ color: shadow }}>{score.value}</strong><span>{score.scale ? `/ ${score.scale}` : '分'}{score.qualifier && <em>{score.qualifier}</em>}</span></div>
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
