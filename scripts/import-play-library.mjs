import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseKeyValues } from './steam/local.mjs'
import { validateJournal } from './journal-data.mjs'

const [steamExport, activitySnapshot, steamRoot] = process.argv.slice(2)
if (!steamExport || !activitySnapshot) {
  throw new Error('用法：node scripts/import-play-library.mjs <Steam已玩导出.json> <三平台活动快照.json> [Steam目录]')
}

const readJson = async filename => JSON.parse(await readFile(filename, 'utf8'))
const steam = await readJson(steamExport)
const activity = await readJson(activitySnapshot)
const { profiles } = await readJson(new URL('../data/steam-config.json', import.meta.url))
const delisted = await readJson(new URL('../data/steam-delisted.json', import.meta.url))
if (!profiles.includes(steam.steamid) || steam.steamid !== activity.platforms?.steam?.account) throw new Error('Steam 账号与游记配置不匹配')
if (activity.platforms?.psn?.source !== 'psn-api' || activity.platforms?.switch?.source !== 'nintendo-history') {
  throw new Error('主机快照来源不匹配')
}
const current = await readJson(new URL('../public/journal-data.json', import.meta.url))
const validAppId = id => /^\d{1,10}$/.test(id) && Number(id) > 0 && Number(id) <= 0xffffffff
const knownSteam = new Set(current.games.map(game => game.steamAppId).filter(id => id && validAppId(id)))
const localPlayed = new Map()
if (steamRoot) {
  const account = BigInt(steam.steamid) - 76561197960265728n
  if (account <= 0n || account > 0xffffffffn) throw new Error('Steam 本机账号编号无效')
  const file = path.join(steamRoot, 'userdata', String(account), 'config', 'localconfig.vdf')
  const { UserLocalConfigStore: config } = parseKeyValues(await readFile(file, 'utf8'))
  const apps = config?.Software?.Valve?.Steam?.apps
  if (!apps || typeof apps !== 'object') throw new Error('Steam 本机游玩记录格式不匹配')
  // 只取游戏 ID、游玩分钟与最近游玩时间。文件中的其他字段不会写出。
  for (const [id, app] of Object.entries(apps)) {
    const minutes = Number(app.Playtime)
    if (validAppId(id) && Number.isSafeInteger(minutes) && minutes > 0) {
      localPlayed.set(id, { totalMinutes: minutes, lastPlayedEpoch: Number(app.LastPlayed) || 0 })
    }
  }
}

const formatDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
function date(value) {
  if (typeof value === 'number' && value <= 0) return undefined
  if (!value) return undefined
  const time = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isFinite(time.getTime()) ? formatDate.format(time) : undefined
}

function duration(value) {
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return [hours ? hours + ' 小时' : '', minutes ? minutes + ' 分钟' : ''].filter(Boolean).join(' ')
}

async function readStoreItems(ids) {
  const items = new Map()
  for (let start = 0; start < ids.length; start += 40) {
    const batch = ids.slice(start, start + 40)
    const request = {
      ids: batch.map(appid => ({ appid: Number(appid) })),
      context: { language: 'schinese', country_code: 'US' },
      data_request: { include_assets: true, include_assets_without_overrides: true },
    }
    const endpoint = new URL('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/')
    endpoint.searchParams.set('input_json', JSON.stringify(request))
    const reply = await fetch(endpoint, { signal: AbortSignal.timeout(20000), redirect: 'error' })
    if (!reply.ok) throw new Error('Steam 商店资源请求失败：' + reply.status)
    const rows = (await reply.json()).response?.store_items
    if (!Array.isArray(rows) || rows.length !== batch.length) throw new Error('Steam 商店资源分页不完整')
    for (const item of rows) {
      if (item.success !== 1) continue
      if (!batch.includes(String(item.appid)) || items.has(String(item.appid))) throw new Error('Steam 商店条目不匹配')
      items.set(String(item.appid), item)
    }
  }
  return items
}

function steamArt(id, item, knownCover) {
  const assets = item?.assets_without_overrides ?? item?.assets
  const root = 'https://shared.fastly.steamstatic.com/store_item_assets/'
  const appRoot = root + 'steam/apps/' + id + '/'
  const fromStore = fields => !assets?.asset_url_format?.startsWith('steam/apps/' + id + '/') ? [] : fields
    .map(field => assets[field])
    .filter(name => typeof name === 'string' && /^[a-zA-Z0-9_./-]+$/.test(name) && !name.includes('..'))
    .map(name => root + assets.asset_url_format.replace('${FILENAME}', name))
  return [...new Set([
    ...fromStore(['library_capsule_2x', 'library_capsule']),
    ...(typeof knownCover === 'string' && /^(?:[a-f0-9]{40}\/)?library_(?:600x900|capsule)(?:_2x)?\.jpg$/.test(knownCover)
      ? [appRoot + knownCover] : []),
    appRoot + 'library_600x900_2x.jpg',
    appRoot + 'library_600x900.jpg',
    ...fromStore(['main_capsule_2x', 'main_capsule', 'header_2x', 'header']),
    appRoot + 'capsule_616x353.jpg',
    appRoot + 'header.jpg',
  ])]
}

function consoleArt(value, domains) {
  if (!value) return []
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !domains.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain))) return []
  return [url.href]
}

async function availableCover(candidates) {
  for (const url of candidates) {
    try {
      const result = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(7000), redirect: 'error' })
      if (result.ok && result.headers.get('content-type')?.startsWith('image/')) return url
    } catch { /* 留给已收录的本地封面或无图盒面。 */ }
  }
}

if (!Array.isArray(steam.games) || !steam.games.length) throw new Error('Steam 已玩清单为空')
const played = new Map()
for (const game of steam.games) {
  if (!validAppId(game.id) || typeof game.title !== 'string' || !game.title.trim() ||
      !Number.isSafeInteger(game.totalMinutes) || game.totalMinutes <= 0 || played.has(game.id)) throw new Error('Steam 已玩条目无效')
  played.set(game.id, game)
}
const steamIds = [...new Set([...knownSteam, ...played.keys(), ...localPlayed.keys()])]
const store = await readStoreItems(steamIds)
const games = []
const imageRequests = new Map()
const excludedSteam = new Set(['1812620', '431960']) // 主页同步已配置的手柄工具和动态壁纸。
const isGame = item => [0, 1, 2, 12].includes(item?.type) // 游戏、试玩版、独立模组、试玩测试。
const isDelistedGame = item => ['game', 'demo', 'beta'].includes(item?.type)
const localOnly = []
const excludedNonGames = []

for (const id of new Set([...played.keys(), ...localPlayed.keys()])) {
  const remote = played.get(id)
  const local = localPlayed.get(id)
  const info = store.get(id)
  const fallback = delisted[id]
  const isPlayable = isGame(info) || isDelistedGame(fallback)
  if (excludedSteam.has(id) || (!knownSteam.has(id) &&
      (info || fallback) && !isPlayable)) {
    excludedNonGames.push({ id, title: info?.name ?? fallback?.title ?? remote?.title, type: info?.type ?? fallback?.type })
    continue
  }
  if (!remote && !isPlayable && !knownSteam.has(id)) {
    localOnly.push(id)
    continue
  }
  const title = info?.name?.trim() || fallback?.title || remote?.title?.trim() || current.games.find(game => game.steamAppId === id)?.title
  if (!title) throw new Error('Steam 游戏名称缺失')
  games.push({
    id: 'steam-' + id, steamAppId: id, title, categories: ['Steam'], notes: [],
    playtime: duration(Math.max(remote?.totalMinutes || 0, local?.totalMinutes || 0)),
    lastPlayedAt: date(Math.max(remote?.lastPlayedEpoch || 0, local?.lastPlayedEpoch || 0)),
  })
}
for (const id of [...new Set([...knownSteam, ...games.map(game => game.steamAppId)])]) {
  imageRequests.set('steam-' + id, steamArt(id, store.get(id), delisted[id]?.cover))
}

const switch2Ids = new Set(['0400be80238d4000', '040074a01bf12000']) // Nintendo 的 Switch 2 独占作：The Duskbloods、Donkey Kong Bananza。
const excludedPsn = new Set(['PPSA01616_00', 'PPSA06274_00']) // Netflix、bilibili。
for (const platform of ['psn', 'switch']) {
  const snapshot = activity.platforms[platform]
  if (!Array.isArray(snapshot.games) || !snapshot.games.length) throw new Error('主机快照未返回游戏')
  for (const record of snapshot.games) {
    if (!Number.isSafeInteger(record.totalMinutes) || record.totalMinutes < 0) throw new Error('主机游玩时间非法')
    if (!record.totalMinutes || (platform === 'psn' && excludedPsn.has(record.id))) continue
    if (platform === 'psn' ? !/^(CUSA|PPSA)\d{5}_00$/.test(record.id) : !/^[0-9a-f]{16}$/i.test(record.id)) throw new Error('主机游戏 ID 格式不匹配')
    const tag = platform === 'psn' ? (record.id.startsWith('PPSA') ? 'PS5' : 'PS4')
      : (/Nintendo Switch 2 Edition/i.test(record.title) || switch2Ids.has(record.id) ? 'Switch 2' : 'Switch')
    const id = platform + '-' + record.id.toLowerCase().replace('_', '-')
    games.push({ id, title: record.title.trim(), categories: [tag], notes: [], playtime: duration(record.totalMinutes), lastPlayedAt: date(record.lastPlayedAt) })
    imageRequests.set(id, consoleArt(record.imageUrl, platform === 'psn' ? ['playstation.com'] : ['nintendo.net', 'nintendo.com', 'nintendo.co.jp']))
  }
}

games.sort((a, b) => a.id.localeCompare(b.id, 'en'))
validateJournal({ games })
const caseCovers = {}
const requests = [...imageRequests].sort(([a], [b]) => a.localeCompare(b, 'en'))
for (let start = 0; start < requests.length; start += 12) {
  const batch = requests.slice(start, start + 12)
  const found = await Promise.all(batch.map(async ([id, candidates]) => [id, await availableCover(candidates)]))
  for (const [id, url] of found) if (url) caseCovers[id] = url
}

const sources = { steam: steam.collectedAt, psn: activity.platforms.psn.collectedAt, switch: activity.platforms.switch.collectedAt }
if (!Object.values(sources).every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))) throw new Error('来源同步时间缺失')
await writeFile(new URL('../data/play-library.json', import.meta.url), JSON.stringify({ sources, games }, null, 2) + '\n')
await writeFile(new URL('../data/case-covers.json', import.meta.url), JSON.stringify(caseCovers, null, 2) + '\n')
console.log(JSON.stringify({
  steamPlayed: played.size, steamLocalPlayed: localPlayed.size, excludedNonGames, unresolvedLocalAppIds: localOnly,
  games: Object.fromEntries(Object.entries(Object.groupBy(games, g => g.categories[0])).map(([key, group]) => [key, group.length])),
  covers: Object.keys(caseCovers).length,
}, null, 2))
