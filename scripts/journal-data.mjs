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
    const markdownImages = [game.review, ...(game.reviews || [])].filter(r => r?.format === 'markdown')
      .flatMap(r => [...r.content.matchAll(/!\[[^\]]*\]\(([^\s)]+)\)/g)].map(m => m[1]))
    for (const value of [game.cover, ...(game.screenshots || []).map(s => s.src), ...markdownImages].filter(Boolean)) {
      if (value.startsWith('https://')) {
        const url = new URL(value)
        if (url.username || url.password) throw new Error(`图片地址非法: ${value}`)
      } else {
        if (!/^\/?(?:covers|media)\/[a-zA-Z0-9_./-]+$/.test(value) || value.includes('..') || value.includes('//')) throw new Error(`图片路径非法: ${value}`)
        await access(path.join(publicDir, value.replace(/^\//, '')))
      }
    }
  }
}
