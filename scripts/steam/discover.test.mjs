import test from 'node:test'
import assert from 'node:assert/strict'
import { discoverScreenshots, parseScreenshotGrid, chooseDiscoveredScreenshots, discoverProfileScreenshots } from './discover.mjs'

const profile = '76561198256716552'
const page = (start, end, total, ids, next = '') => `<div id="image_wall">Showing ${start} - ${end} of ${total}${ids.map(id => `<a data-publishedfileid="${id}" data-appid="42"><div class="imgWallItem" style="background-image: url('https://images.steamusercontent.com/ugc/${id}/');"><div class="imgWallHover">原始说明 ${id}</div></div></a>`).join('')}<div class="pagingPageLinks">${next ? `<a href="${next}">下一页</a>` : ''}</div></div>`

test('全量发现使用来源分页链接并核对唯一 ID 和总数', async () => {
  const urls = []
  const pages = [page(1, 2, 3, ['1', '2'], '?p=2&view=grid&privacy=30'), page(3, 3, 3, ['3'])]
  const result = await discoverScreenshots(profile, async url => { urls.push(url); return pages.shift() })
  assert.equal(result.total, 3)
  assert.equal(result.captioned, 3)
  assert.equal(result.pages, 2)
  assert.match(urls[1], /privacy=30/)
  assert.equal(result.items[2].imageUrl, 'https://images.steamusercontent.com/ugc/3/')
})

test('跨游戏收齐带说明的图，保留精选图，无文字游戏补一张，不能静默截断', () => {
  const items = [
    { id: '1', appId: 'a', hint: '' }, { id: '2', appId: 'a', hint: '我的说明' },
    { id: '3', appId: 'a', hint: '另一条说明' }, { id: '4', appId: 'b', hint: '' },
    { id: '5', appId: 'b', hint: '' },
  ]
  assert.deepEqual(chooseDiscoveredScreenshots(items, ['1'], 10), ['1', '2', '3', '4'])
  assert.throws(() => chooseDiscoveredScreenshots(items, ['1'], 3), /不能截断/)
  assert.throws(() => chooseDiscoveredScreenshots(items, ['404'], 10), /缺失/)
})

test('私密页、重复页、总数变化及扫描截断不得当成全量成功', async () => {
  assert.throws(() => parseScreenshotGrid('<div>No screenshots available</div>'), /总数不可确认/)
  const first = page(1, 2, 3, ['1', '2'], '?p=2&view=grid')
  for (const last of [page(3, 3, 3, ['2']), page(3, 3, 4, ['3'])]) {
    const pages = [first, last]
    await assert.rejects(discoverScreenshots(profile, async () => pages.shift()), /重复|变化/)
  }
  await assert.rejects(discoverScreenshots(profile, async () => first, { maxPages: 1 }), /未完成/)
})

test('按页面提供的游戏分组发现，分组总数必须与全库一致', async () => {
  const catalog = page(1, 2, 3, ['1', '2']) + `<div id="sharedfiles_filterselect_app_filterable"><div class="option" onclick="SelectSharedFilesContentFilter({ 'appid': '42' })">Game A</div><div class="option" onclick="SelectSharedFilesContentFilter({ 'appid': '43' })">Game B</div></div>`
  const get = async url => url.includes('appid=42') ? page(1, 2, 2, ['1', '2']) : url.includes('appid=43') ? page(1, 1, 1, ['3']).replaceAll('data-appid="42"', 'data-appid="43"') : catalog
  const result = await discoverProfileScreenshots(profile, get, { retryDelay: 0 })
  assert.equal(result.total, 3)
  assert.equal(result.games.length, 2)
  assert.deepEqual(result.items.map(s => s.id), ['3', '2', '1'])
  await assert.rejects(discoverProfileScreenshots(profile, async url => (await get(url)).replace('Showing 1 - 2 of 3', 'Showing 1 - 2 of 4'), { retryDelay: 0 }), /总库不一致/)
})

test('异常空页需要刷新补读，恢复后仍核对全库数量', async () => {
  const calls = []
  const result = await discoverScreenshots(profile, async (url, binary, options) => {
    calls.push({ url, refresh: options?.refresh })
    if (url.includes('p=1')) return page(1, 2, 3, ['1', '2'], '?p=2&view=grid')
    return options?.refresh ? page(3, 3, 3, ['3']) : '<div id="NoItemsContainer">No screenshots available</div>'
  }, { retryDelay: 0 })
  assert.equal(result.total, 3)
  assert.equal(calls.filter(c => c.refresh).length, 1)
})
