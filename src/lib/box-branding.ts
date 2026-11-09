import steam from '../../data/steam-developers.json'
import consoles from '../../data/console-developers.json'
import type { JournalGame } from '../types'

const steamDevelopers: Readonly<Record<string, string>> = steam
const consoleDevelopers: Readonly<Record<string, string>> = consoles

const studioLogos = new Map([
  ['Square Enix', 'squareenix.webp'],
  ['KOEI TECMO GAMES CO., LTD.', 'koei-tecmo.webp'],
  ['Nihon Falcom', 'falcom.webp'],
  ['CAPCOM Co., Ltd.', 'capcom.webp'],
  ['CAPCOM CO., LTD', 'capcom.webp'],
  ['Capcom', 'capcom.webp'],
  ['Nintendo', 'nintendo.webp'],
  ['HAL Laboratory', 'hal-laboratory.webp'],
  ['Vanillaware', 'vanillaware.webp'],
  ['Monolith Soft', 'monolith-soft.webp'],
  ['Remedy Entertainment', 'remedyentertainment.webp'],
  ['Ubisoft Montreal', 'ubisoft.webp'],
  ['Ubisoft Quebec', 'ubisoft.webp'],
  ['KOJIMA PRODUCTIONS', 'kojima.webp'],
  ['Pocketpair', 'pocketpair.webp'],
  ['BANDAI NAMCO Studio Inc.', 'bandai-namco-studios.webp'],
  ['BANDAI NAMCO Studios Inc.', 'bandai-namco-studios.webp'],
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
  const name = game.steamAppId ? steamDevelopers[game.steamAppId] : consoleDevelopers[game.id]
  return name ? { name, logo: studioLogos.get(name) } : null
}
