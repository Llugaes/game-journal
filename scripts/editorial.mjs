import { validateJournal } from './journal-schema.mjs'
import { extractScores } from './review-scores.mjs'

const fields = {
  game: ['title', 'originalTitle', 'categories', 'summary', 'status', 'playtime', 'lastPlayedAt', 'recordedAt', 'cover', 'personalScores'],
  reviews: ['title', 'content', 'verdict', 'postedAt', 'updatedAt'],
  screenshots: ['src', 'width', 'height', 'title', 'caption', 'date'],
  notes: ['title', 'date', 'createdAt', 'feeling', 'moment'],
  comments: ['content', 'createdAt'],
}
const children = { game: ['reviews', 'screenshots', 'notes'], screenshots: ['comments'] }
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)
const equal = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const safeId = id => { if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('记录 ID 非法'); return id }

export function normalizeGame(game) {
  const next = structuredClone(game)
  next.reviews = [...(next.review ? [{ ...next.review, id: next.review.id || `legacy-review-${game.id}` }] : []), ...(next.reviews || [])]
  delete next.review
  next.screenshots ||= []
  next.notes ||= []
  for (const shot of next.screenshots) shot.comments ||= []
  return next
}

function diffRecord(base, next, kind) {
  const patch = { fields: {}, collections: {} }
  for (const key of fields[kind]) if (!equal(base?.[key], next[key])) patch.fields[key] = next[key] ?? null
  for (const name of children[kind] || []) {
    const before = base?.[name] || [], after = next[name] || []
    if (!Array.isArray(after)) throw new Error(`${name} 必须为数组`)
    const changes = { upsert: {}, remove: before.filter(x => !after.some(y => x.id === y.id)).map(x => x.id) }
    const ids = after.map(x => safeId(x.id))
    if (new Set(ids).size !== ids.length) throw new Error('记录 ID 重复')
    for (const item of after) {
      const old = before.find(x => x.id === item.id)
      const delta = diffRecord(old, item, name)
      if (!old || Object.keys(delta.fields).length || Object.keys(delta.collections).length) changes.upsert[item.id] = delta
    }
    const expected = before.filter(x => ids.includes(x.id)).map(x => x.id).concat(ids.filter(id => !before.some(x => x.id === id)))
    if (!equal(expected, ids)) changes.order = ids
    if (Object.keys(changes.upsert).length || changes.remove.length || changes.order) patch.collections[name] = changes
  }
  return patch
}

function applyRecord(base, patch, kind) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('编辑记录格式非法')
  const next = structuredClone(base)
  for (const [key, value] of Object.entries(patch.fields || {})) {
    if (!fields[kind].includes(key)) throw new Error(`不可编辑字段: ${key}`)
    if (value === null) delete next[key]
    else next[key] = structuredClone(value)
  }
  for (const [name, collection] of Object.entries(patch.collections || {})) {
    if (!(children[kind] || []).includes(name)) throw new Error(`不可编辑集合: ${name}`)
    const map = new Map((next[name] || []).map(item => [item.id, item]))
    for (const id of collection.remove || []) map.delete(safeId(id))
    for (const [id, delta] of Object.entries(collection.upsert || {})) map.set(safeId(id), applyRecord(map.get(id) || { id }, delta, name))
    const order = (collection.order || []).map(safeId)
    if (new Set(order).size !== order.length) throw new Error('排序 ID 重复')
    next[name] = [...order.filter(id => map.has(id)).map(id => map.get(id)), ...[...map.values()].filter(item => !order.includes(item.id))]
  }
  if (kind === 'reviews' && has(patch.fields || {}, 'content')) {
    next.scores = extractScores(next.content || '')
    if (next.source) next.edited = true
  }
  if (kind === 'screenshots') next.comments ||= []
  return next
}

export function applyEditorial(journal, editorial = { version: 1, games: {} }) {
  if (editorial.version !== 1 || !editorial.games || Array.isArray(editorial.games)) throw new Error('不支持的编辑数据版本')
  const map = new Map(journal.games.map(game => [game.id, normalizeGame(game)]))
  for (const [id, patch] of Object.entries(editorial.games)) {
    safeId(id)
    const base = map.get(id) || { id, categories: [], reviews: [], screenshots: [], notes: [] }
    map.set(id, applyRecord(base, patch, 'game'))
  }
  return validateJournal({ games: [...map.values()] })
}

// 只保存与源数据不同的可编辑字段；Steam 后续新增的截图和评论继续合入。
export function updateEditorial(base, editorial, editedGames) {
  const result = structuredClone(editorial)
  if (!Array.isArray(editedGames) || new Set(editedGames.map(x => x.id)).size !== editedGames.length) throw new Error('游戏列表非法')
  for (const game of editedGames) {
    safeId(game.id)
    const normalized = normalizeGame(game)
    normalized.categories = normalized.categories.map(x => x.trim()).filter(Boolean)
    const source = base.games.find(x => x.id === game.id)
    const patch = diffRecord(source ? normalizeGame(source) : undefined, normalized, 'game')
    if (Object.keys(patch.fields).length || Object.keys(patch.collections).length) result.games[game.id] = patch
    else delete result.games[game.id]
  }
  const data = applyEditorial(base, result)
  return { editorial: result, data }
}
