import { mkdir, readFile, writeFile } from 'node:fs/promises'

const source = new URL('../data/journal.json', import.meta.url)
const output = new URL('../public/journal-data.json', import.meta.url)
const parsed = JSON.parse(await readFile(source, 'utf8'))
if (!Array.isArray(parsed.entries)) throw new Error('data/journal.json 必须包含 entries 数组')

const entries = parsed.entries.map((entry) => {
  for (const key of ['id', 'game', 'date', 'createdAt']) {
    if (!String(entry?.[key] || '').trim()) throw new Error(`随笔条目缺少 ${key}`)
  }
  if (!Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 5) throw new Error(`随笔条目 ${entry.id} 的 rating 必须是 1-5`)
  return {
    id: String(entry.id), game: String(entry.game), date: String(entry.date),
    playtime: String(entry.playtime || ''), rating: entry.rating,
    feeling: String(entry.feeling || ''), moment: String(entry.moment || ''),
    imageIds: [], createdAt: String(entry.createdAt),
  }
})

await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8')
console.log(`journal index: ${entries.length} entries`)
