import type { JournalGame } from '../types'

export const reviewsOf = (game: JournalGame) => [...(game.review ? [game.review] : []), ...(game.reviews || [])]
export const ratingLabel = (game: JournalGame) => game.rating != null ? `${'★'.repeat(game.rating)}${'☆'.repeat(5 - game.rating)}` : reviewsOf(game)[0]?.verdict || '游玩记录'
export const recordedDate = (game: JournalGame) => game.recordedAt || game.lastPlayedAt || game.notes.at(-1)?.date || ''
export const assetUrl = (value: string) => value.startsWith('https://') ? value : `${import.meta.env.BASE_URL}${value.replace(/^\//, '')}`
