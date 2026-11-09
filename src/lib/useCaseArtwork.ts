import { useState } from 'react'
import type { JournalGame } from '../types'
import { assetUrl } from './journal'

export function useCaseArtwork(game: JournalGame, surface: 'case' | 'spine' = 'case') {
  const [index, setIndex] = useState(0)
  const candidates = surface === 'spine'
    ? [game.boxCover, game.cover, game.caseCover]
    : [game.caseCover, game.cover]
  const images = [...new Set(candidates)].filter((value): value is string => !!value)
  return {
    src: images[index] ? assetUrl(images[index]) : undefined,
    onError: () => setIndex(index + 1),
  }
}
