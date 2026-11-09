import { useState } from 'react'
import type { JournalGame } from '../types'
import { assetUrl } from './journal'

export function useCaseArtwork(game: JournalGame) {
  const [index, setIndex] = useState(0)
  const images = [...new Set([game.caseCover, game.cover])].filter((value): value is string => !!value)
  return {
    src: images[index] ? assetUrl(images[index]) : undefined,
    onError: () => setIndex(index + 1),
  }
}
