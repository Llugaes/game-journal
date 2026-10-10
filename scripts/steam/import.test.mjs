import test from 'node:test'
import assert from 'node:assert/strict'
import { load } from 'cheerio'
import { parseReviewList, parseReview, parseScreenshot, plainText, steamDate } from './parse.mjs'
import { assertSteamUrl } from './client.mjs'
import { selectScreenshots } from './collect.mjs'
import { mergeJournals, validateJournal } from '../journal-data.mjs'

const profile = '76561198256716552'
const now = new Date('2026-10-11T00:00:00Z')
const game = { id: 'steam-42', title: '真实标题', categories: ['Steam'], notes: [], reviews: [], screenshots: [] }

test('日期保留来源年份，省略年份跨年时不产生未来记录', () => {
  assert.equal(steamDate('7 Oct @ 12:50am', now), '2026-10-07')
  assert.equal(steamDate('31 December, 2020', now), '2020-12-31')
  assert.equal(steamDate('31 Dec @ 8:00pm', new Date('2026-01-02')), '2025-12-31')
  assert.throws(() => steamDate('not a date', now))
})

test('正文保留分段、表情和链接，去除可执行 HTML', () => {
  const $ = load('<div id="body"><div class="bb_h1">标题</div>甲<br>乙<br><br>丙<img alt=":smile:"><a href="https://example.com/">链接</a><script>bad()</script></div>')
  assert.equal(plainText($('#body')), '标题\n甲\n乙\n\n丙:smile:链接 (https://example.com/)')
})

test('列表验证总数和评测归属，错误页不能当空数据', () => {
  const html = `<div class="workshopBrowsePagingInfo">Showing 1-10 of 111 entries</div><div class="review_box"><div class="title"><a href="https://steamcommunity.com/profiles/${profile}/recommended/42/">Recommended</a></div></div>`
  assert.deepEqual(parseReviewList(html, profile), { total: 111, pages: 12, items: [{ appId: '42', url: `https://steamcommunity.com/profiles/${profile}/recommended/42/`, capsule: undefined }] })
  assert.throws(() => parseReviewList('<title>Error</title>', profile))
  assert.throws(() => parseReviewList(html, '76561198198442111'))
  assert.deepEqual(parseReviewList('<div class="review_stat"><div class="giantNumber">0</div></div>', profile), { total: 0, pages: 0, items: [] })
})

test('评测保留原始 BBCode、推荐结论与评测时长，不推导五星', () => {
  const html = '<meta property="og:title" content="Steam Community :: Author :: Review for Game"><div class="ratingSummary">Not Recommended</div><div class="recommendation_date">Posted: 6 Oct @ 5:21am<br>Updated: 7 Oct @ 12:50am</div><div class="playTime">30 hrs on record (11.3 hrs at review time)</div><div id="ReviewText"><div class="bb_h1">5/10 原标题</div>原话<br>另一行</div><textarea id="ReviewEditTextArea">[h1]5/10 原标题[/h1]原话</textarea>'
  const result = parseReview(html, profile, '42', now)
  assert.equal(result.review.verdict, '不推荐')
  assert.equal(result.review.playtimeAtReview, '11.3')
  assert.equal(result.review.rawText, '[h1]5/10 原标题[/h1]原话')
  assert.equal(result.review.updatedAt, '2026-10-07')
  assert.equal(result.rating, undefined)
})

test('截图核对作者并区分本人和他人评论', () => {
  const html = '<div class="creatorsBlock"><div data-miniprofile="296450824"></div><div class="friendBlockContent">Author<br><span>Online</span></div></div><div class="apphub_AppName">Game</div><a href="https://images.steamusercontent.com/ugc/test/"><img id="ActualMedia"></a><textarea id="description">我写的说明</textarea><div class="detailsStatLeft">Posted</div><div class="detailsStatRight">7 Oct @ 9:56am</div><span id="comments_totalcount">2</span><div class="commentthread_comment" id="comment_1"><a data-miniprofile="296450824"></a><span data-timestamp="1700000000"></span><div class="commentthread_comment_text">我的评论</div></div><div class="commentthread_comment" id="comment_2"><a data-miniprofile="100"></a><div class="commentthread_comment_text">他人的评论</div></div>'
  const shot = parseScreenshot(html, { id: '12', appId: '42' }, profile, now)
  assert.equal(shot.caption, '我写的说明')
  assert.deepEqual(shot.comments.map(c => c.own), [true, false])
  assert.equal(shot.totalComments, 2)
  assert.throws(() => parseScreenshot(html, { id: '12', appId: '42' }, '76561198198442111', now))
})

test('截图按说明优先限量，固定 ID 可重复选择且缺失时报错', () => {
  const shots = [{ id: '1', caption: '', date: '2026-10-10', comments: [] }, { id: '2', caption: '原话', date: '2026-10-09', comments: [] }]
  const config = { screenshotLimit: 1, screenshotIds: [], comments: 'own' }
  assert.equal(selectScreenshots(shots, config)[0].id, '2')
  assert.equal(selectScreenshots(shots, { ...config, screenshotIds: ['1'] })[0].id, '1')
  assert.throws(() => selectScreenshots(shots, { ...config, screenshotIds: ['3'] }))
})

test('公开索引保留原文，去掉原始抓取字段，拒绝重复 ID、脚本 URL 和路径穿越', () => {
  const valid = validateJournal({ games: [{ ...game, reviews: [{ id: 'r1', content: '原文', rawText: 'raw', originalDateText: 'date' }] }] })
  assert.equal(valid.games[0].rating, undefined)
  assert.equal(valid.games[0].reviews[0].content, '原文')
  assert.equal(valid.games[0].reviews[0].rawText, undefined)
  assert.throws(() => validateJournal({ games: [game, game] }))
  assert.throws(() => validateJournal({ games: [{ ...game, cover: 'javascript:alert(1)' }] }))
  assert.throws(() => validateJournal({ games: [{ ...game, cover: 'media/../../secret' }] }))
  assert.throws(() => validateJournal({ games: [{ ...game, rating: 0 }] }))
})

test('Steam 更新不覆盖手写评测和随笔，合并结果稳定', () => {
  const manual = { games: [{ ...game, title: '手写标题', review: { content: '手写评测' }, notes: [{ id: 'n', date: '2026-10-11', createdAt: '2026-10-11T00:00:00Z', feeling: '笔记' }] }] }
  const imported = { games: [{ ...game, reviews: [{ id: 'r', content: 'Steam 原话' }] }] }
  const first = mergeJournals(manual, imported)
  assert.equal(first.games[0].title, '手写标题')
  assert.equal(first.games[0].review.content, '手写评测')
  assert.equal(first.games[0].reviews[0].content, 'Steam 原话')
  assert.deepEqual(first, mergeJournals(manual, imported))
  assert.equal(imported.games[0].title, '真实标题')
})

test('抓取来源限制为 Steam HTTPS，拒绝凭据、相似域名与本地地址', () => {
  assertSteamUrl('https://images.steamusercontent.com/ugc/123/')
  for (const value of ['http://steamcommunity.com/', 'https://steamcommunity.com.evil.test/', 'https://127.0.0.1/', 'https://user:secret@steamcommunity.com/']) assert.throws(() => assertSteamUrl(value))
})
