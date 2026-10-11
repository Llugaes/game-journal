import { access } from 'node:fs/promises'
import path from 'node:path'

import { validateJournal } from './journal-schema.mjs'
export { validateJournal } from './journal-schema.mjs'

// 手写资料独立保存；同一游戏的手写字段优先，Steam 全文及截图追加。
export function mergeJournals(manual, imported) {
  validateJournal(manual)
  validateJournal(imported)
  const map = new Map(imported.games.map(game => [game.id, structuredClone(game)]))
  for (const game of manual.games) {
    const previous = map.get(game.id)
    map.set(game.id, previous ? { ...previous, ...game, reviews: [...(game.reviews || []), ...(previous.reviews || [])], screenshots: [...(game.screenshots || []), ...(previous.screenshots || [])], notes: game.notes } : game)
  }
  return { games: [...map.values()].sort((a, b) => (b.recordedAt || b.lastPlayedAt || '').localeCompare(a.recordedAt || a.lastPlayedAt || '')) }
}

export async function validateAssets(journal, publicDir) {
  for (const game of journal.games) {
    for (const value of [game.cover, ...(game.screenshots || []).map(s => s.src)].filter(Boolean)) {
      if (!value.startsWith('https://')) await access(path.join(publicDir, value.replace(/^\//, '')))
    }
  }
}
