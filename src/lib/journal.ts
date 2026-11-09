import type { JournalGame, JournalScore } from '../types'

export const reviewsOf = (game: JournalGame) => [...(game.review ? [game.review] : []), ...(game.reviews || [])]
export const scoresOf = (game: JournalGame): JournalScore[] => {
  if (game.personalScores !== undefined) return game.personalScores
  if (game.rating != null) return [{ label: '总评', value: String(game.rating), scale: 5, evidence: '' }]
  const reviews = reviewsOf(game)
  return reviews.flatMap(review => (review.scores || []).map(score => ({ ...score, label: reviews.length > 1 ? `${review.source?.authorName || '评测'} · ${score.label}` : score.label })))
}
export const recordedDate = (game: JournalGame) =>
  [game.recordedAt, game.lastPlayedAt, game.notes.at(-1)?.date].filter(Boolean).sort().at(-1) || ''
export const assetUrl = (value: string) => value.startsWith('https://') ? value : `${import.meta.env.BASE_URL}${value.replace(/^\//, '')}`

export const platforms = {
  steam: 'Steam', pc: 'PC', ps2: 'PS2', ps3: 'PS3', ps4: 'PS4', ps5: 'PS5', vita: 'PS Vita',
  switch: 'Switch', switch2: 'Switch 2', unknown: '未标注',
} as const
export type Platform = keyof typeof platforms

const platformTags = new Map<string, Platform>([
  ['steam', 'steam'], ['pc', 'pc'],
  ['ps2', 'ps2'], ['playstation2', 'ps2'], ['ps3', 'ps3'], ['playstation3', 'ps3'], ['ps4', 'ps4'], ['playstation4', 'ps4'],
  ['ps5', 'ps5'], ['playstation5', 'ps5'], ['psv', 'vita'], ['psvita', 'vita'], ['playstationvita', 'vita'],
  ['ns', 'switch'], ['switch', 'switch'], ['nintendoswitch', 'switch'],
  ['ns2', 'switch2'], ['switch2', 'switch2'], ['nintendoswitch2', 'switch2'],
])

export function platformOf(game: JournalGame): Platform {
  // Categories can carry an explicit play platform. A title or release platform is not evidence.
  const tags = new Set(game.categories.flatMap(category => {
    const platform = platformTags.get(category.normalize('NFKC').toLowerCase().replace(/\s+/g, ''))
    return platform ? [platform] : []
  }))
  // Steam imports often already carry a Steam category; a single explicit play platform takes priority.
  const steam = tags.delete('steam') || !!game.steamAppId
  if (tags.size === 1) return [...tags][0]
  if (steam) return 'steam'
  return 'unknown'
}

export const gameHref = (id: string) => `#game=${encodeURIComponent(id)}`
