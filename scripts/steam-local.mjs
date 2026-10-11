import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile, mkdir, copyFile, rename } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from './steam/client.mjs'
import { readLocalScreenshots, readLocalImage, selectLocalScreenshots, mergeSteamScreenshots } from './steam/local.mjs'
import { validateJournal, validateAssets } from './journal-data.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { values } = parseArgs({ options: { 'steam-root': { type: 'string' }, profile: { type: 'string' }, apply: { type: 'boolean', default: false } } })
const config = JSON.parse(await readFile(path.join(root, 'data/steam-config.json'), 'utf8'))
const profile = values.profile || (config.profiles.length === 1 ? config.profiles[0] : undefined)
if (!profile || !config.profiles.includes(profile)) throw new Error('需要在 steam-config.json 中选定的 profile')
const steamRoot = values['steam-root'] || (process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam'))
if (!steamRoot) throw new Error('使用 --steam-root 指定 Steam 安装目录')
const target = path.join(root, 'data/steam-local.json')
const online = JSON.parse(await readFile(path.join(root, 'data/steam.json'), 'utf8'))
let previous = { games: [] }
try { previous = JSON.parse(await readFile(target, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
validateJournal(previous)
const authors = new Set(online.games.flatMap(g => [...(g.reviews || []), ...(g.screenshots || [])]).filter(s => s.source?.profileId === profile).map(s => s.source.authorName))
if (authors.size !== 1) throw new Error('无法从已有核实内容确定唯一账号作者名')
const authorName = [...authors][0]
const { directory, records } = await readLocalScreenshots(steamRoot, profile)
const selected = selectLocalScreenshots(records, online, previous)
const stage = path.join(root, '.local/steam-local')
await mkdir(path.join(stage, 'assets'), { recursive: true })
const draft = structuredClone(previous)
const warnings = []
const get = createClient(path.join(stage, 'cache'))
const allPrevious = previous.games.flatMap(g => g.screenshots)
for (const shot of allPrevious.filter(s => s.source.profileId === profile)) {
  const record = records.find(r => `steam-${r.id}` === shot.id)
  if (record && record.permissions !== '8') throw new Error(`已补录截图 ${shot.id} 的本地权限不再为公开，请人工核查`)
  if (!record) warnings.push(`${shot.id}: 本机索引中已缺失，保留已发布副本`)
}
for (const record of selected) {
  const id = `steam-${record.appId}`
  let game = draft.games.find(g => g.id === id)
  if (!game) {
    let title = online.games.find(g => g.id === id)?.title
    if (!title) {
      const api = `https://store.steampowered.com/api/appdetails?appids=${record.appId}&l=schinese&filters=basic`
      const response = JSON.parse(await get(api))[record.appId]
      if (!response?.success || !response.data?.name) throw new Error(`缺少官方游戏名称: ${record.appId}`)
      title = response.data.name.trim()
    }
    game = { id, steamAppId: record.appId, title, categories: ['Steam'], notes: [], reviews: [], screenshots: [] }
    draft.games.push(game)
  }
  const image = await sharp(await readLocalImage(directory, record.filename)).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
  const asset = `steam-${record.id}.webp`
  await writeFile(path.join(stage, 'assets', asset), image.data)
  const prior = game.screenshots.find(s => s.id === `steam-${record.id}`)
  const shot = { id: `steam-${record.id}`, src: `media/steam/${asset}`, width: image.info.width, height: image.info.height,
    caption: record.caption || undefined, date: record.capturedAt.slice(0, 10),
    source: { platform: 'steam', url: `https://steamcommunity.com/sharedfiles/filedetails/?id=${record.id}`, profileId: profile, authorName },
    comments: prior?.comments || [], localSource: { kind: 'steam-screenshots-vdf', capturedAt: record.capturedAt, permissions: record.permissions } }
  if (prior) game.screenshots[game.screenshots.indexOf(prior)] = shot
  else game.screenshots.push(shot)
  game.recordedAt = game.screenshots.map(s => s.date).sort().at(-1)
  game.cover ||= shot.src
}
draft.games.sort((a, b) => a.id.localeCompare(b.id))
draft.games.forEach(g => g.screenshots.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)))
const merged = validateJournal(mergeSteamScreenshots(online, draft))
const nextShots = draft.games.flatMap(g => g.screenshots)
const report = { profileId: profile, uploadedRecords: records.length, publicRecords: records.filter(r => r.permissions === '8').length,
  localCaptionRecords: records.filter(r => r.caption.trim()).length,
  added: nextShots.filter(s => !allPrevious.some(p => p.id === s.id)).length,
  updated: nextShots.filter(s => allPrevious.some(p => p.id === s.id && JSON.stringify(p) !== JSON.stringify(s))).length,
  supplementScreenshots: nextShots.length, totalScreenshots: merged.games.reduce((n, g) => n + g.screenshots.length, 0),
  selectedIds: selected.map(r => r.id), coverage: '仅本机截图索引中已上传且标记公开的图片；日期是拍摄日期，评论区不在本地索引中，未声称全云端覆盖。', warnings }
await writeFile(path.join(stage, 'draft.json'), JSON.stringify(draft, null, 2) + '\n')
await writeFile(path.join(stage, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
if (values.apply) {
  for (const record of selected) await copyFile(path.join(stage, 'assets', `steam-${record.id}.webp`), path.join(root, 'public/media/steam', `steam-${record.id}.webp`))
  await validateAssets(merged, path.join(root, 'public'))
  if (JSON.stringify(previous) !== JSON.stringify(draft)) {
    await writeFile(`${target}.tmp`, JSON.stringify(draft, null, 2) + '\n')
    await rename(`${target}.tmp`, target)
    console.log('本地补图已应用；未修改 Steam 客户端、在线评测或手写内容。')
  } else console.log('无内容变化。')
}
