import type { JournalReview } from '../types'

export function RecommendationBadge({ verdict, compact = false }: { verdict?: JournalReview['verdict']; compact?: boolean }) {
  if (!verdict) return <span className="verdict-empty">游玩记录</span>
  const positive = verdict === '推荐'
  return <span className={`verdict-badge verdict-badge--${positive ? 'positive' : 'negative'}${compact ? ' verdict-badge--compact' : ''}`}>
    <svg className="verdict-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g transform={positive ? undefined : 'rotate(180 12 12)'}>
        <path fill="currentColor" d="M2 10h4v11H2zM8 10l5-8c2 0 3 1.3 2.6 3.2L15 9h5.3c1.2 0 2 .9 1.7 2.1l-1.8 8c-.2 1.1-1.1 1.9-2.3 1.9H8z" />
      </g>
    </svg>
    <span>{verdict}</span>
  </span>
}
