import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'

// Steam 的截图索引是文本 KeyValues；不读取登录配置或浏览器凭据。
export function parseKeyValues(text) {
  const tokens = []
  const pattern = /\s+|\/\/[^\n]*|"(?:\\.|[^"\\])*"|[{}]/gy
  let offset = 0
  while (offset < text.length) {
    pattern.lastIndex = offset
    const match = pattern.exec(text)
    if (!match) throw new Error(`Steam 截图索引格式错误: ${offset}`)
    offset = pattern.lastIndex
    if (!/^\s|^\/\//.test(match[0])) tokens.push(match[0])
  }
  let cursor = 0
  const string = token => {
    if (!token?.startsWith('"')) throw new Error('Steam 截图索引缺少字符串')
    return token.slice(1, -1).replace(/\\([\\"nrt])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t' }[c] || c))
  }
  function object(nested = false) {
    const result = Object.create(null)
    while (cursor < tokens.length && tokens[cursor] !== '}') {
      const key = string(tokens[cursor++])
      if (Object.hasOwn(result, key)) throw new Error(`Steam 截图索引重复字段: ${key}`)
      const token = tokens[cursor++]
      result[key] = token === '{' ? object(true) : string(token)
    }
    if (nested && tokens[cursor++] !== '}') throw new Error('Steam 截图索引括号未闭合')
    return result
  }
  const result = object()
  if (cursor !== tokens.length) throw new Error('Steam 截图索引多余内容')
  return result
}

export function parseLocalScreenshots(text) {
  const root = parseKeyValues(text).screenshots
  if (!root || typeof root !== 'object') throw new Error('缺少 screenshots 根节点')
  const records = [], seen = new Set()
  for (const [appId, entries] of Object.entries(root)) {
    if (!/^\d+$/.test(appId) || typeof entries !== 'object') continue
    for (const entry of Object.values(entries)) {
      if (!entry || typeof entry !== 'object' || !entry.filename) continue
      const id = entry.publishedfileid
      if (!/^\d+$/.test(id || '') || BigInt(id) === 0n) continue
      if (seen.has(id)) throw new Error(`本地截图上传 ID 重复: ${id}`)
      seen.add(id)
      if (entry.gameid !== appId || !entry.filename.startsWith(`${appId}/screenshots/`)
        || entry.filename.includes('..') || entry.filename.includes('\\') || path.isAbsolute(entry.filename)) throw new Error(`截图路径或游戏不匹配: ${id}`)
      if (!/^\d+$/.test(entry.creation || '') || !Number.isFinite(new Date(Number(entry.creation) * 1000).getTime())) throw new Error(`截图拍摄时间无效: ${id}`)
      records.push({ id, appId, filename: entry.filename, caption: entry.caption || '', permissions: entry.Permissions,
        capturedAt: new Date(Number(entry.creation) * 1000).toISOString() })
    }
  }
  return records
}

export async function readLocalScreenshots(steamRoot, profile) {
  if (!/^\d{17}$/.test(profile)) throw new Error('SteamID64 无效')
  const account = BigInt(profile) - 76561197960265728n
  if (account < 1n || account > 4294967295n) throw new Error('Steam 账号 ID 无效')
  const directory = path.join(steamRoot, 'userdata', String(account), '760')
  const records = parseLocalScreenshots(await readFile(path.join(directory, 'screenshots.vdf'), 'utf8'))
  return { directory, records }
}

export async function readLocalImage(directory, filename) {
  const root = await realpath(path.join(directory, 'remote'))
  const file = await realpath(path.join(root, filename))
  const relative = path.relative(root, file)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('截图原图超出 Steam 截图目录')
  return readFile(file)
}

export function hasAuthorizedLocalText(record, { nonPublicScreenshots = 'exclude', ownCommentIds = [] } = {}) {
  if (!['exclude', 'own-text'].includes(nonPublicScreenshots)) throw new Error('nonPublicScreenshots 仅支持 exclude 或 own-text')
  return nonPublicScreenshots === 'own-text' && ['2', '4', '16'].includes(record.permissions)
    && (Boolean(record.caption.trim()) || ownCommentIds.includes(record.id))
}

export function selectLocalScreenshots(records, online, previous, policy = {}) {
  const onlineIds = new Set(online.games.flatMap(g => g.screenshots || []).map(s => s.id.replace(/^steam-/, '')))
  const retained = new Set(previous.games.flatMap(g => g.screenshots || []).map(s => s.id.replace(/^steam-/, '')))
  const represented = new Set([...online.games, ...previous.games].filter(g => g.screenshots?.length).map(g => g.steamAppId))
  // 非公开图只在用户明确授权且有本人说明/已核实留言时进入；普通补图仍只用公开图。
  const eligible = records.filter(r => r.permissions === '8' || hasAuthorizedLocalText(r, policy)).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || (BigInt(a.id) > BigInt(b.id) ? -1 : 1))
  const selected = eligible.filter(r => !onlineIds.has(r.id) && (r.caption.trim() || retained.has(r.id) || policy.ownCommentIds?.includes(r.id) || hasAuthorizedLocalText(r, policy)))
  selected.forEach(r => represented.add(r.appId))
  for (const shot of eligible.filter(r => r.permissions === '8')) if (!represented.has(shot.appId) && !onlineIds.has(shot.id)) {
    selected.push(shot)
    represented.add(shot.appId)
  }
  return selected
}

// 云端已核实字段优先，按稳定 ID 去重；本地补图不会被常规网页同步清空。
export function mergeSteamScreenshots(online, supplement) {
  const games = new Map(online.games.map(g => [g.id, structuredClone(g)]))
  const owners = new Map(online.games.flatMap(g => (g.screenshots || []).map(s => [s.id, g.id])))
  for (const local of supplement.games) {
    if (local.reviews?.length || local.notes?.length || local.review) throw new Error('本地截图补录不能覆盖评测或随笔')
    const game = games.get(local.id) || { ...structuredClone(local), screenshots: [] }
    const ids = new Set((game.screenshots || []).map(s => s.id))
    for (const shot of local.screenshots || []) {
      if (owners.has(shot.id) && owners.get(shot.id) !== local.id) throw new Error(`截图游戏归属冲突: ${shot.id}`)
      if (!ids.has(shot.id)) { game.screenshots.push(structuredClone(shot)); ids.add(shot.id) }
      owners.set(shot.id, local.id)
    }
    game.cover ||= game.screenshots[0]?.src
    game.recordedAt = [game.recordedAt, ...game.screenshots.map(s => s.date)].filter(Boolean).sort().at(-1)
    games.set(game.id, game)
  }
  return { games: [...games.values()] }
}

export function mergeSteamComments(journal, verifiedComments) {
  const result = structuredClone(journal)
  const shots = new Map(result.games.flatMap(g => g.screenshots || []).map(s => [s.id, s]))
  const seen = new Set()
  for (const { screenshotId, profileId, id, content, createdAt } of verifiedComments) {
    const shot = shots.get(screenshotId)
    if (!shot || shot.source?.profileId !== profileId) throw new Error(`本人评论的截图或作者不匹配: ${screenshotId}`)
    if (!/^comment_\d+$/.test(id) || seen.has(id) || !content?.trim() || !Number.isFinite(Date.parse(createdAt))) throw new Error('已核实评论格式无效或重复')
    seen.add(id)
    shot.comments ||= []
    // 网页重新公开的原文优先；本机核实的原文作为补充保留。
    if (!shot.comments.some(c => c.id === id)) shot.comments.push({ id, content, createdAt })
  }
  return result
}
