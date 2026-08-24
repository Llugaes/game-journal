import { mkdir, readFile, writeFile } from 'node:fs/promises'

const source = new URL('../data/journal.json', import.meta.url)
const output = new URL('../public/journal-data.json', import.meta.url)
const parsed = JSON.parse(await readFile(source, 'utf8'))
if (!Array.isArray(parsed.games)) throw new Error('data/journal.json 必须包含 games 数组')

const games = parsed.games.map((game) => {
  for (const key of ['id', 'title']) if (!String(game?.[key] || '').trim()) throw new Error(`游戏缺少 ${key}`)
  if (!Number.isInteger(game.rating) || game.rating < 1 || game.rating > 5) throw new Error(`游戏 ${game.id} 的 rating 必须是 1-5`)
  if (!Array.isArray(game.categories) || !game.categories.every(category => typeof category === 'string')) throw new Error(`游戏 ${game.id} 的 categories 必须是字符串数组`)
  if (!Array.isArray(game.notes)) throw new Error(`游戏 ${game.id} 的 notes 必须是数组`)
  const notes = game.notes.map((note) => {
    for (const key of ['id', 'date', 'createdAt', 'feeling']) if (!String(note?.[key] || '').trim()) throw new Error(`游戏 ${game.id} 的随笔缺少 ${key}`)
    return { id: String(note.id), date: String(note.date), createdAt: String(note.createdAt), title: note.title ? String(note.title) : undefined, feeling: String(note.feeling), moment: note.moment ? String(note.moment) : undefined }
  })
  const review = game.review ? { title: game.review.title ? String(game.review.title) : undefined, verdict: game.review.verdict ? String(game.review.verdict) : undefined, content: String(game.review.content || ''), updatedAt: game.review.updatedAt ? String(game.review.updatedAt) : undefined } : undefined
  return { id: String(game.id), title: String(game.title), categories: game.categories.map(String), rating: game.rating, summary: game.summary ? String(game.summary) : undefined, status: game.status ? String(game.status) : undefined, playtime: game.playtime ? String(game.playtime) : undefined, lastPlayedAt: game.lastPlayedAt ? String(game.lastPlayedAt) : undefined, cover: game.cover ? String(game.cover) : undefined, review, notes }
})

await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, `${JSON.stringify({ games }, null, 2)}\n`, 'utf8')
console.log(`journal index: ${games.length} games`)
