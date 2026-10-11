import { load } from 'cheerio'
import { profileUrl, parseScreenshotList } from './parse.mjs'
import { setTimeout as sleep } from 'node:timers/promises'

export function parseScreenshotGrid(html) {
  const $ = load(html)
  const range = $('#image_wall').text().match(/Showing\s+([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/)
  if (!range) throw new Error('截图总数不可确认，停止全量发现')
  const [start, end, total] = range.slice(1).map(s => Number(s.replaceAll(',', '')))
  const items = parseScreenshotList(html).map(item => {
    if (!/^\d+$/.test(item.id) || !/^\d+$/.test(item.appId)) throw new Error('截图 ID 或游戏 ID 无效')
    const node = $(`a[data-publishedfileid="${item.id}"]`)
    const style = node.find('.imgWallItem').attr('style') || ''
    return { ...item, imageUrl: style.match(/url\(['"]?([^'"\)]+)/)?.[1] || node.find('img').attr('src') }
  })
  if (items.length !== end - start + 1) throw new Error('截图分页数量不一致')
  const links = $('.pagingPageLinks a[href]').map((_, n) => $(n).attr('href')).get()
  return { start, end, total, items, links }
}

export async function discoverScreenshots(profile, get, { maxPages = 100, progress = () => {}, retryDelay = 15000, firstUrl = `${profileUrl(profile)}/screenshots/?l=english&view=grid&p=1` } = {}) {
  let first
  for (let attempt = 0; attempt < 3; attempt++) {
    const html = await get(firstUrl, false, { refresh: attempt > 0 })
    try { first = parseScreenshotGrid(html); break } catch (error) {
      if (attempt === 2) throw error
      await sleep(retryDelay)
    }
  }
  const expected = first.total, perPage = first.items.length, pages = Math.ceil(expected / perPage)
  if (first.start !== 1 || expected < 1) throw new Error('截图首页范围无效')
  if (!perPage || pages > maxPages) throw new Error(`截图超过 ${maxPages} 页；未完成全量发现`)
  const template = first.links.map(link => new URL(link, firstUrl)).find(link => link.searchParams.get('p') === '2')
  if (pages > 1 && (!template || template.origin !== new URL(firstUrl).origin || template.pathname !== new URL(firstUrl).pathname)) throw new Error('缺少可靠的下一页链接')
  const results = new Map([[1, first]])
  const readPage = async (page, refresh = false) => {
    const url = new URL(template)
    url.searchParams.set('p', String(page))
    url.searchParams.set('l', 'english')
    const html = await get(url.href, false, { refresh })
    // 只暂缓异常 HTML；网络限流仍由 client 退避并停止。
    try { results.set(page, parseScreenshotGrid(html)) } catch {
      progress({ page, collected: [...results.values()].reduce((n, p) => n + p.items.length, 0), total: expected, retry: refresh ? 2 : 1 })
      return
    }
    progress({ page, collected: [...results.values()].reduce((n, p) => n + p.items.length, 0), total: expected })
  }
  for (let page = 2; page <= pages; page++) await readPage(page)
  // 完成其他页面后再补读异常页，让 Steam 有恢复时间，不在同一页密集重试。
  for (let attempt = 0; attempt < 2; attempt++) {
    const missing = Array.from({ length: pages }, (_, i) => i + 1).filter(p => !results.has(p))
    if (!missing.length) break
    await sleep(retryDelay)
    for (const page of missing) await readPage(page, true)
  }
  const missing = Array.from({ length: pages }, (_, i) => i + 1).filter(p => !results.has(p))
  if (missing.length) throw new Error(`截图缺页 ${missing.join(', ')}；未完成全量发现，已保留其他页缓存`)
  const items = [], seen = new Set()
  for (let page = 1; page <= pages; page++) {
    const result = results.get(page)
    if (result.total !== expected || result.start !== items.length + 1) throw new Error('采集期间截图列表变化，请重新发现')
    for (const item of result.items) {
      if (seen.has(item.id)) throw new Error('截图分页重复，不能确认全量覆盖')
      seen.add(item.id); items.push(item)
    }
  }
  if (items.length !== expected) throw new Error('截图总数不一致，未完成全量发现')
  return { profile, total: expected, pages, captioned: items.filter(s => s.hint).length, items }
}

export async function discoverProfileScreenshots(profile, get, { progress = () => {}, retryDelay = 15000 } = {}) {
  const base = `${profileUrl(profile)}/screenshots/`
  const html = await get(`${base}?l=english&view=grid&p=1`)
  const { total } = parseScreenshotGrid(html)
  const $ = load(html)
  const games = $('#sharedfiles_filterselect_app_filterable .option').map((_, node) => ({
    appId: $(node).attr('onclick')?.match(/'appid': '(\d+)'/)?.[1], title: $(node).text().trim(),
  })).get()
  if (!games.length || games.some(g => !g.appId) || new Set(games.map(g => g.appId)).size !== games.length) throw new Error('无法完整识别截图游戏列表')
  const items = [], counts = []
  let pages = 0
  for (const game of games) {
    const result = await discoverScreenshots(profile, get, {
      firstUrl: `${base}?appid=${game.appId}&sort=newestfirst&browsefilter=myfiles&view=grid&l=english`, retryDelay,
    })
    if (result.items.some(item => item.appId !== game.appId)) throw new Error('游戏筛选结果不匹配')
    items.push(...result.items)
    pages += result.pages
    counts.push({ ...game, total: result.total, captioned: result.captioned })
    progress({ game: game.title, page: counts.length, collected: items.length, total })
  }
  if (items.length !== total || new Set(items.map(s => s.id)).size !== total) throw new Error(`游戏分组截图与总库不一致: ${items.length}/${total}`)
  items.sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)
  return { profile, total, pages, games: counts, captioned: items.filter(s => s.hint).length, items }
}

// 已选图片持续保留；有说明的全部纳入，尚无选图的游戏补一张。
export function chooseDiscoveredScreenshots(items, pinnedIds, limit) {
  const byId = new Map(items.map(item => [item.id, item]))
  if (pinnedIds.some(id => !byId.has(id))) throw new Error('已选截图在完整公开列表中缺失，停止自动选择')
  const selected = new Set([...pinnedIds, ...items.filter(item => item.hint).map(item => item.id)])
  const represented = new Set([...selected].map(id => byId.get(id).appId))
  for (const item of items) if (!represented.has(item.appId)) {
    selected.add(item.id)
    represented.add(item.appId)
  }
  if (selected.size > limit) throw new Error(`需要 ${selected.size} 张截图，超过 screenshotLimit=${limit}；不能截断带说明的图片`)
  return [...selected]
}
