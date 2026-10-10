import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, copyFile, rename } from 'node:fs/promises'
import { collect } from './steam/collect.mjs'
import { validateJournal, validateAssets, mergeJournals } from './journal-data.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { values, positionals } = parseArgs({ allowPositionals: true, options: { config: { type: 'string', default: 'data/steam-config.json' }, refresh: { type: 'boolean', default: false }, apply: { type: 'boolean', default: false } } })
const command = positionals[0] || 'plan'
if (!['collect', 'plan', 'apply', 'sync'].includes(command)) throw new Error('用法: steam-import.mjs collect|plan|apply|sync [--refresh] [--apply] [--config path]')
const directory = path.join(root, '.local/steam-import')
const target = path.join(root, 'data/steam.json')
const config = JSON.parse(await readFile(path.resolve(root, values.config), 'utf8'))
if (!Array.isArray(config.profiles) || !config.profiles.length || !config.profiles.every(p => /^\d{17}$/.test(p)) || new Set(config.profiles).size !== config.profiles.length) throw new Error('profiles 必须为不重复的 SteamID64 字符串数组')
if (!['own', 'none'].includes(config.comments)) throw new Error('comments 仅支持 own 或 none')
for (const [key, max] of [['screenshotLimit', 50], ['screenshotPages', 100]]) if (!Number.isInteger(config[key]) || config[key] < 0 || config[key] > max) throw new Error(`${key} 必须为 0-${max} 的整数`)
if (!Array.isArray(config.screenshotIds) || !config.screenshotIds.every(id => /^\d+$/.test(id)) || new Set(config.screenshotIds).size !== config.screenshotIds.length) throw new Error('screenshotIds 必须为不重复的截图 ID 字符串数组')
const configHash = createHash('sha256').update(JSON.stringify(config)).digest('hex')
if (command === 'collect' || command === 'sync') {
  const report = await collect(config, directory, { refresh: values.refresh })
  report.configHash = configHash
  report.draftHash = createHash('sha256').update(await readFile(path.join(directory, 'draft.json'))).digest('hex')
  await writeFile(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}
if (command !== 'collect') {
  const draftText = await readFile(path.join(directory, 'draft.json'), 'utf8')
  const draft = JSON.parse(draftText)
  const report = JSON.parse(await readFile(path.join(directory, 'report.json'), 'utf8'))
  if (report.configHash !== configHash || report.draftHash !== createHash('sha256').update(draftText).digest('hex')) throw new Error('配置或草稿已变化，请重新 collect')
  const publicData = validateJournal(draft)
  const manual = JSON.parse(await readFile(path.join(root, 'data/journal.json'), 'utf8'))
  validateJournal(mergeJournals(manual, draft))
  let previous = { games: [] }
  try { previous = JSON.parse(await readFile(target, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const oldById = new Map(previous.games.map(g => [g.id, g]))
  const removed = previous.games.filter(g => !draft.games.some(n => n.id === g.id)).map(g => g.id)
  const missingReviews = previous.games.flatMap(g => (g.reviews || []).filter(r => !draft.games.some(n => n.reviews?.some(nr => nr.id === r.id))).map(r => r.id))
  const missingScreenshots = previous.games.flatMap(g => (g.screenshots || []).filter(s => !draft.games.some(n => n.screenshots?.some(ns => ns.id === s.id))).map(s => s.id))
  const summary = { added: draft.games.filter(g => !oldById.has(g.id)).length, updated: draft.games.filter(g => oldById.has(g.id) && JSON.stringify(g) !== JSON.stringify(oldById.get(g.id))).length, unchanged: draft.games.filter(g => JSON.stringify(g) === JSON.stringify(oldById.get(g.id))).length, removed, missingReviews, missingScreenshots, reviews: report.reviews, screenshots: report.screenshots, captions: report.captions, ownComments: report.ownComments, warnings: report.warnings }
  console.log(JSON.stringify(summary, null, 2))
  await writeFile(path.join(directory, 'plan.json'), `${JSON.stringify(summary, null, 2)}\n`)
  if (command === 'apply' || (command === 'sync' && values.apply)) {
    if (removed.length || missingReviews.length || missingScreenshots.length) throw new Error(`来源内容减少；保留现有站点，请先人工核查来源。缺失截图: ${missingScreenshots.join(', ')}`)
    for (const game of publicData.games) for (const src of [game.cover, ...game.screenshots.map(s => s.src)].filter(Boolean)) {
      if (!src.startsWith('media/steam/')) throw new Error('导入资源目录不匹配')
      await readFile(path.join(directory, 'assets', path.basename(src)))
    }
    await mkdir(path.join(root, 'public/media/steam'), { recursive: true })
    for (const game of publicData.games) for (const src of [game.cover, ...game.screenshots.map(s => s.src)].filter(Boolean)) await copyFile(path.join(directory, 'assets', path.basename(src)), path.join(root, 'public', src))
    await validateAssets(publicData, path.join(root, 'public'))
    if (JSON.stringify(previous) !== JSON.stringify(draft)) {
      await writeFile(path.join(directory, 'previous.json'), `${JSON.stringify(previous, null, 2)}\n`)
      await writeFile(`${target}.tmp`, draftText)
      await rename(`${target}.tmp`, target)
      console.log('已应用到 data/steam.json；运行 npm run build 后按正常 Git 流程发布。')
    } else console.log('无内容变化；未改写数据。')
  }
}
