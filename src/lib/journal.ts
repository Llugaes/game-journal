import type { JournalGame, JournalScore } from '../types'

export const reviewsOf = (game: JournalGame) => [...(game.review ? [game.review] : []), ...(game.reviews || [])]
export const scoresOf = (game: JournalGame): JournalScore[] => {
  if (game.rating != null) return [{ label: '总评', value: String(game.rating), scale: 5, evidence: '' }]
  const reviews = reviewsOf(game)
  return reviews.flatMap(review => (review.scores || []).map(score => ({ ...score, label: reviews.length > 1 ? `${review.source?.authorName || '评测'} · ${score.label}` : score.label })))
}
export const recordedDate = (game: JournalGame) => game.recordedAt || game.lastPlayedAt || game.notes.at(-1)?.date || ''
export const assetUrl = (value: string) => value.startsWith('https://') ? value : `${import.meta.env.BASE_URL}${value.replace(/^\//, '')}`
