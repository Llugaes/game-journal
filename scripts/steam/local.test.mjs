import test from 'node:test'
import assert from 'node:assert/strict'
import { parseKeyValues, parseLocalScreenshots, selectLocalScreenshots, mergeSteamScreenshots, mergeSteamComments } from './local.mjs'

test('KeyValues 保留中文、引号和换行，拒绝截断及重复字段', () => {
  assert.equal(parseKeyValues('"caption" "原话\\n\\"测试\\""').caption, '原话\n"测试"')
  assert.throws(() => parseKeyValues('"screenshots" { "a" "b"'), /未闭合/)
  assert.throws(() => parseKeyValues('"a" "1" "a" "2"'), /重复/)
})
test('本地索引只识别已上传 ID，并拒绝路径跨越和归属异常', () => {
  const entry = (filename, game = '10') => `"screenshots" { "10" { "0" { "filename" "${filename}" "gameid" "${game}" "creation" "1700000000" "publishedfileid" "900" "Permissions" "8" "caption" "原话" } } }`
  assert.equal(parseLocalScreenshots(entry('10/screenshots/a.jpg'))[0].caption, '原话')
  assert.throws(() => parseLocalScreenshots(entry('10/screenshots/../../x.jpg')), /路径/)
  assert.throws(() => parseLocalScreenshots(entry('10/screenshots/a.jpg', '11')), /不匹配/)
  assert.deepEqual(parseLocalScreenshots(entry('10/screenshots/a.jpg').replace('"900"', '"0"')), [])
})
test('收齐公开说明，普通图每个尚无截图的游戏只选一张，不引入私密和重复图', () => {
  const shot = (id, appId, caption = '', permissions = '8') => ({ id, appId, caption, permissions, capturedAt: `2026-01-${id.padStart(2, '0')}` })
  const online = { games: [{ id: 'steam-10', steamAppId: '10', screenshots: [{ id: 'steam-1' }] }] }
  const selected = selectLocalScreenshots([shot('1','10','已有'),shot('2','10'),shot('3','11'),shot('4','11'),shot('5','12','文字'),shot('6','12','另一条'),shot('7','13','私密','2'),shot('8','14','好友','4')], online, { games: [] })
  assert.deepEqual(selected.map(s => s.id).sort(), ['4', '5', '6'])
})
test('本地补图和云端按 ID 合并，评测原样保留，重复以云端为准', () => {
  const online = { games: [{ id:'steam-10', steamAppId:'10', reviews:[{id:'review',content:'完整原文'}], screenshots:[{id:'steam-1',caption:'云端',date:'2026-01-01'}] }] }
  const local = { games: [{id:'steam-10',reviews:[],notes:[],screenshots:[{id:'steam-1',caption:'本地旧值',date:'2025-01-01'},{id:'steam-2',date:'2026-01-02',src:'media/steam/a.webp'}]}] }
  const merged = mergeSteamScreenshots(online,local)
  assert.deepEqual(merged.games[0].reviews,online.games[0].reviews)
  assert.equal(merged.games[0].screenshots.length,2)
  assert.equal(merged.games[0].screenshots[0].caption,'云端')
  assert.deepEqual(mergeSteamScreenshots(merged,local),merged)
  assert.equal(online.games[0].screenshots.length,1)
  assert.throws(()=>mergeSteamScreenshots(online,{games:[{id:'steam-11',screenshots:[{id:'steam-1'}]}]}),/归属冲突/)
  assert.throws(()=>mergeSteamScreenshots(online,{games:[{id:'steam-10',reviews:[{}]}]}),/不能覆盖/)
})
test('已核实本人评论保留原文、稳定去重，并拒绝错作者或错截图', () => {
  const journal = { games: [{ screenshots: [{id:'steam-10',source:{profileId:'76561198256716552'},comments:[]}]}] }
  const comment = {screenshotId:'steam-10',profileId:'76561198256716552',id:'comment_900',content:'原文\n第二行',createdAt:'2026-10-06T12:42:39.000Z'}
  const merged = mergeSteamComments(journal,[comment])
  assert.equal(merged.games[0].screenshots[0].comments[0].content,comment.content)
  assert.deepEqual(mergeSteamComments(merged,[comment]),merged)
  assert.equal(journal.games[0].screenshots[0].comments.length,0)
  assert.throws(()=>mergeSteamComments(journal,[{...comment,profileId:'76561190000000000'}]),/作者不匹配/)
  assert.throws(()=>mergeSteamComments(journal,[{...comment,screenshotId:'steam-11'}]),/不匹配/)
})
test('明确授权后仅引入带本人说明或已核实本人留言的非公开截图', () => {
  const empty = { games: [] }
  const shot = (id, permissions, caption = '') => ({ id, appId: id, permissions, caption, capturedAt:'2026-01-01' })
  const records = [shot('1','2','私密说明'),shot('2','4','好友说明'),shot('3','16','非公开说明'),shot('4','2'),shot('5','4'),shot('6','8'),shot('7','unknown','未知权限')]
  assert.deepEqual(selectLocalScreenshots(records,empty,empty).map(s=>s.id),['6'])
  const selected = selectLocalScreenshots(records,empty,empty,{nonPublicScreenshots:'own-text',ownCommentIds:['4']})
  assert.deepEqual(selected.map(s=>s.id).sort(),['1','2','3','4','6'])
  const previous={games:[{id:'steam-5',steamAppId:'5',screenshots:[{id:'steam-5'}]}]}
  assert.ok(!selectLocalScreenshots(records,empty,previous,{nonPublicScreenshots:'own-text'}).some(s=>s.id==='5'))
  assert.throws(()=>selectLocalScreenshots(records,empty,empty,{nonPublicScreenshots:'all'}),/仅支持/)
  const represented={games:[{id:'steam-8',steamAppId:'8',screenshots:[{id:'steam-80'}]}]}
  assert.deepEqual(selectLocalScreenshots([shot('8','8')],represented,empty,{ownCommentIds:['8']}).map(s=>s.id),['8'])
})
