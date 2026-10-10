import { access } from 'node:fs/promises'
import path from 'node:path'

const required = (value, label) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`); return value }
const optional = value => typeof value === 'string' && value.trim() ? value : undefined
function url(value) {
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`来源必须为 HTTPS: ${value}`)
  return value
}
function asset(value) {
  if (!value) return undefined
  if (value.startsWith('https://')) return url(value)
  if (!/^\/?(?:covers|media)\/[a-zA-Z0-9_./-]+$/.test(value) || value.includes('..') || value.includes('//')) throw new Error(`图片路径非法: ${value}`)
  return value
}
const date = value => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`日期非法: ${value}`); return value }
function source(value) {
  if (!value) return undefined
  if (value.platform !== 'steam' || !/^\d{17}$/.test(value.profileId)) throw new Error('Steam 来源缺少账号 ID')
  const parsed = new URL(url(value.url))
  if (parsed.hostname !== 'steamcommunity.com') throw new Error('Steam 来源域名不匹配')
  return { platform: 'steam', url: value.url, profileId: value.profileId, authorName: required(value.authorName, '作者') }
}
function review(value) {
  if (!value) return undefined
  if (value.verdict && !['推荐', '暂不推荐', '不推荐'].includes(value.verdict)) throw new Error('未知评测结论')
  return { id: optional(value.id), title: optional(value.title), verdict: value.verdict, content: required(value.content, '评测正文'), postedAt: value.postedAt ? date(value.postedAt) : undefined, updatedAt: value.updatedAt ? date(value.updatedAt) : undefined, playtimeAtReview: optional(value.playtimeAtReview), source: source(value.source) }
}
function unique(items, label) {
  const ids = items.map(x => required(x.id, `${label} ID`))
  if (new Set(ids).size !== ids.length) throw new Error(`${label} ID 重复`)
}

export function validateJournal(parsed) {
  if (!Array.isArray(parsed.games)) throw new Error('数据必须包含 games 数组')
  unique(parsed.games, '游戏')
  return { games: parsed.games.map(game => {
    if (!/^[a-z0-9-]+$/.test(game.id)) throw new Error(`游戏 ID 非法: ${game.id}`)
    if (game.rating != null && (!Number.isInteger(game.rating) || game.rating < 1 || game.rating > 5)) throw new Error(`游戏 ${game.id} 的 rating 必须是 1-5 或省略`)
    if (!Array.isArray(game.categories) || !game.categories.every(x => typeof x === 'string')) throw new Error(`游戏 ${game.id} 的 categories 必须是字符串数组`)
    if (!Array.isArray(game.notes)) throw new Error(`游戏 ${game.id} 缺少 notes`)
    unique(game.notes, '随笔')
    unique(game.reviews || [], '评测')
    unique(game.screenshots || [], '截图')
    return {
      id: game.id, title: required(game.title, '游戏名'), categories: game.categories,
      rating: game.rating ?? undefined, summary: optional(game.summary), status: optional(game.status), playtime: optional(game.playtime),
      lastPlayedAt: game.lastPlayedAt ? date(game.lastPlayedAt) : undefined, recordedAt: game.recordedAt ? date(game.recordedAt) : undefined,
      steamAppId: optional(game.steamAppId), cover: asset(game.cover), review: review(game.review), reviews: (game.reviews || []).map(review),
      notes: game.notes.map(note => ({ id: note.id, date: date(note.date), createdAt: required(note.createdAt, '随笔时间'), title: optional(note.title), feeling: required(note.feeling, '随笔正文'), moment: optional(note.moment) })),
      screenshots: (game.screenshots || []).map(shot => {
        if (!Number.isInteger(shot.width) || !Number.isInteger(shot.height) || shot.width < 1 || shot.height < 1) throw new Error('截图尺寸不合法')
        unique(shot.comments || [], '截图评论')
        return { id: shot.id, src: required(asset(shot.src), '截图路径'), width: shot.width, height: shot.height, title: optional(shot.title), caption: optional(shot.caption), date: date(shot.date), source: source(shot.source), comments: (shot.comments || []).map(c => ({ id: c.id, content: required(c.content, '评论'), createdAt: optional(c.createdAt) })) }
      }),
    }
  }) }
}

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
