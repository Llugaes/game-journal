import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { load } from 'cheerio'
import sharp from 'sharp'
import { createClient } from './client.mjs'
import { discoverScreenshots, chooseDiscoveredScreenshots } from './discover.mjs'
import { profileUrl, fileUrl, parseReviewList, parseReview, parseScreenshotList, parseScreenshot } from './parse.mjs'

export async function collect(config, directory, { refresh = false } = {}) {
  const get = createClient(path.join(directory, 'cache'), { refresh })
  const now = new Date()
  const reviews = [], screenshots = [], warnings = [], counts = []
  const discovery = []
  if (config.discoverCaptions) {
    let priorIds = []
    try {
      const previous = JSON.parse(await readFile(new URL('../../data/steam.json', import.meta.url), 'utf8'))
      priorIds = previous.games.flatMap(g => g.screenshots || []).filter(s => config.profiles.includes(s.source?.profileId)).map(s => s.id.replace(/^steam-/, ''))
    } catch (error) { if (error.code !== 'ENOENT') throw error }
    for (const profile of config.profiles) discovery.push(await discoverScreenshots(profile, get, {
      progress: ({ page, collected, total }) => console.log(`完整截图发现 第 ${page} 页 ${collected}/${total}`),
    }))
    config = { ...config, screenshotIds: chooseDiscoveredScreenshots(discovery.flatMap(d => d.items), [...new Set([...config.screenshotIds, ...priorIds])], config.screenshotLimit) }
  }
  await mkdir(path.join(directory, 'assets'), { recursive: true })
  for (const profile of config.profiles) {
    const base = `${profileUrl(profile)}/recommended/?l=english`
    const first = parseReviewList(await get(base), profile)
    const items = [...first.items]
    for (let page = 2; page <= first.pages; page++) {
      const next = parseReviewList(await get(`${base}&p=${page}`), profile)
      if (next.total !== first.total) throw new Error('采集期间评测总数变化，请重新采集')
      items.push(...next.items)
    }
    if (items.length !== first.total || new Set(items.map(item => item.appId)).size !== first.total) throw new Error(`评测分页缺失或重复: ${items.length}/${first.total}`)
    console.log(`Steam ${profile}: ${items.length} 篇评测，读取全文`)
    for (const [index, item] of items.entries()) {
      const review = parseReview(await get(`${item.url}?l=english`), profile, item.appId, now)
      review.capsule = item.capsule
      reviews.push(review)
      if ((index + 1) % 20 === 0) console.log(`评测全文 ${index + 1}/${items.length}`)
    }
    counts.push({ profileId: profile, expectedReviews: first.total, collectedReviews: items.length })
    if (config.screenshotIds.length || config.screenshotLimit === 0) continue
    const candidates = new Map()
    for (let page = 1; page <= config.screenshotPages; page++) {
      const found = parseScreenshotList(await get(`${profileUrl(profile)}/screenshots/?l=english&p=${page}`))
      if (!found.length) break
      const oldSize = candidates.size
      found.forEach(item => candidates.set(item.id, item))
      if (candidates.size === oldSize) throw new Error('截图分页未前进')
      if (page % 10 === 0) console.log(`截图列表 ${page}/${config.screenshotPages} 页`)
    }
    // 有说明的图优先；另读取每个游戏最新两张，避免只有纯截图时无结果。
    const perGame = new Map()
    const sample = [...candidates.values()].filter(item => {
      const count = perGame.get(item.appId) || 0
      perGame.set(item.appId, count + 1)
      return item.hint || count < 2 || config.screenshotIds.includes(item.id)
    })
    const prioritized = sample.sort((a, b) => Number(!!b.hint) - Number(!!a.hint))
    let inspected = 0
    for (const candidate of prioritized) {
      if (inspected >= config.screenshotLimit) break
      const shot = parseScreenshot(await get(`${fileUrl(candidate.id)}&l=english`), candidate, profile, now)
      if (shot.totalComments > shot.comments.length + shot.hiddenComments) {
        // 不静默忽略评论分页：选中此图时必须先解决。
        shot.incompleteComments = true
      }
      screenshots.push(shot)
      inspected++
    }
    console.log(`截图窗口 ${candidates.size} 张，读取说明及评论 ${inspected} 张`)
  }

  // 已选图片按稳定 ID 直接刷新，不因新截图把它们挤出分页窗口而失效。
  for (const [index, id] of config.screenshotIds.entries()) {
    const html = await get(`${fileUrl(id)}&l=english`)
    const $ = load(html)
    const account = $('.creatorsBlock [data-miniprofile]').first().attr('data-miniprofile')
    if (!account || !/^\d+$/.test(account)) throw new Error(`截图 ${id} 缺少作者`)
    const profile = (BigInt(account) + 76561197960265728n).toString()
    if (!config.profiles.includes(profile)) throw new Error(`截图 ${id} 不属于选定账号`)
    const shot = parseScreenshot(html, { id }, profile, now)
    shot.incompleteComments = shot.totalComments > shot.comments.length + shot.hiddenComments
    screenshots.push(shot)
    console.log(`截图详情 ${index + 1}/${config.screenshotIds.length}: ${id}${shot.caption || shot.title ? ' 有说明' : ''}`)
  }

  const selected = selectScreenshots(screenshots, config)
  for (const shot of selected) {
    if (config.comments === 'own' && shot.incompleteComments) throw new Error(`截图 ${shot.id} 评论未完整加载，不能确认所有本人评论`)
    if (config.comments === 'own' && shot.hiddenOwnComments.length) warnings.push(`截图 ${shot.id}: Steam 暂时隐藏 ${shot.hiddenOwnComments.length} 条待审核的本人评论；未把系统提示当成作者文字`)
    const bytes = await get(shot.imageUrl, true)
    const result = await sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
    shot.asset = `steam-${shot.id}.webp`
    shot.width = result.info.width
    shot.height = result.info.height
    await writeFile(path.join(directory, 'assets', shot.asset), result.data)
  }

  const games = new Map()
  for (const item of reviews) {
    const game = games.get(item.appId) || { id: `steam-${item.appId}`, steamAppId: item.appId, title: item.gameTitle, categories: ['Steam'], notes: [], reviews: [], screenshots: [] }
    game.reviews.push(item.review)
    game.summary ||= item.review.content.split('\n').find(Boolean)?.slice(0, 140)
    game.capsule ||= item.capsule
    games.set(item.appId, game)
  }
  for (const shot of selected) {
    const game = games.get(shot.appId) || { id: `steam-${shot.appId}`, steamAppId: shot.appId, title: shot.gameTitle, categories: ['Steam'], notes: [], reviews: [], screenshots: [] }
    game.screenshots.push({ id: `steam-${shot.id}`, src: `media/steam/${shot.asset}`, width: shot.width, height: shot.height, title: shot.title || undefined, caption: shot.caption || undefined, date: shot.date, source: shot.source, comments: config.comments === 'own' ? shot.comments.filter(c => c.own).map(({ own, ...comment }) => comment) : [] })
    games.set(shot.appId, game)
  }
  for (const game of games.values()) {
    game.recordedAt = [...game.reviews.map(r => r.updatedAt), ...game.screenshots.map(s => s.date)].sort().at(-1)
    // 使用页面已提供的真实图源；下载失败只保留文字封面并在报告说明。
    if (game.capsule) {
      try {
        const cover = await sharp(await get(game.capsule, true)).webp({ quality: 85 }).toBuffer()
        const name = `cover-${game.steamAppId}.webp`
        await writeFile(path.join(directory, 'assets', name), cover)
        game.cover = `media/steam/${name}`
      } catch (error) { warnings.push(`封面 ${game.steamAppId}: ${error.message}`) }
      delete game.capsule
    }
    if (!game.cover && game.screenshots.length) game.cover = game.screenshots[0].src
  }
  const result = { games: [...games.values()].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt) || a.id.localeCompare(b.id)) }
  const report = { collectedAt: now.toISOString(), profiles: counts, reviews: reviews.length, games: result.games.length, screenshots: selected.length, captions: selected.filter(s => s.title || s.caption).length, ownComments: result.games.reduce((n, g) => n + g.screenshots.reduce((m, s) => m + s.comments.length, 0), 0), discovery: discovery.map(({ profile, total, pages, captioned }) => ({ profile, total, pages, captioned })), commentCoverage: '仅核查所选截图已加载的公开评论；全库未逐张核查，待审核原文不可见。', screenshotWindowPages: config.screenshotPages, selectedScreenshotIds: selected.map(s => s.id), warnings }
  await writeFile(path.join(directory, 'draft.json'), `${JSON.stringify(result, null, 2)}\n`)
  await writeFile(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(path.join(directory, 'candidates.json'), `${JSON.stringify(screenshots.map(s => ({ id: s.id, appId: s.appId, title: s.title, caption: s.caption, ownComments: s.comments.filter(c => c.own).length, date: s.date, url: s.source.url })), null, 2)}\n`)
  return report
}

export function selectScreenshots(screenshots, config) {
  const seen = new Set()
  const unique = screenshots.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true })
  if (config.screenshotIds.length) {
    const selected = config.screenshotIds.map(id => unique.find(s => s.id === id))
    if (selected.some(s => !s)) throw new Error('指定截图未全部采集到')
    if (selected.length > config.screenshotLimit) throw new Error('指定截图超过 screenshotLimit')
    return selected
  }
  const score = s => (s.caption || s.title ? 2 : 0) + (config.comments === 'own' && s.comments.some(c => c.own) ? 1 : 0)
  return unique.sort((a, b) => score(b) - score(a) || b.date.localeCompare(a.date) || (BigInt(a.id) > BigInt(b.id) ? -1 : 1)).slice(0, config.screenshotLimit)
}
