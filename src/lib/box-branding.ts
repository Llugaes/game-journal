import developers from '../../data/steam-developers.json'
import type { JournalGame } from '../types'

const steamDevelopers: Readonly<Record<string, string>> = developers

const studioLogos = new Map([
  ['Square Enix', 'squareenix.webp'],
  ['KOEI TECMO GAMES CO., LTD.', 'koei-tecmo.webp'],
  ['Nihon Falcom', 'falcom.webp'],
  ['CAPCOM Co., Ltd.', 'capcom.webp'],
  ['CAPCOM CO., LTD', 'capcom.webp'],
  ['Capcom', 'capcom.webp'],
  ['Remedy Entertainment', 'remedyentertainment.webp'],
  ['Ubisoft Montreal', 'ubisoft.webp'],
  ['Ubisoft Quebec', 'ubisoft.webp'],
  ['KOJIMA PRODUCTIONS', 'kojima.webp'],
  ['Pocketpair', 'pocketpair.webp'],
  ['BANDAI NAMCO Studio Inc.', 'bandai-namco-studios.webp'],
  ['Bandai Namco Studios Inc.', 'bandai-namco-studios.webp'],
  ['Bandai Namco Studios', 'bandai-namco-studios.webp'],
  ['FromSoftware, Inc.', 'fromsoftware.webp'],
  ['GAME FREAK inc.', 'game-freak.webp'],
  ['ATLUS', 'atlus.webp'],
  ['RGG Studio', 'rgg.webp'],
  ['Ryu Ga Gotoku Studio', 'rgg.webp'],
  ['IO Interactive A/S', 'io-interactive.webp'],
])

export function studioOf(game: JournalGame) {
  const name = game.steamAppId && steamDevelopers[game.steamAppId]
  return name ? { name, logo: studioLogos.get(name) } : null
}
