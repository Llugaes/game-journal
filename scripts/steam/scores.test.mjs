import test from 'node:test'
import assert from 'node:assert/strict'
import { extractScores, enrichJournal } from '../review-scores.mjs'

test('提取小数和带空格的十分制，不将推荐结论转成分数', () => {
  assert.deepEqual(extractScores('7.5 / 10 一句评价'), [{ label: '总评', value: '7.5', scale: 10, evidence: '7.5 / 10 一句评价' }])
  assert.deepEqual(extractScores('推荐！玩了100分钟，排名第9，通关3小时52分。'), [])
  assert.deepEqual(extractScores('我不理解 IGN 为什么只给7分，至少8分吧'), [])
})
test('保留条件评分和多个维度，正文假设不覆盖标题分数', () => {
  assert.equal(extractScores('6(8)/10 条件评价')[0].value, '6(8)')
  assert.deepEqual(extractScores('原版6/10 极版9/10 如龙').map(s => [s.label, s.value]), [['原版', '6'], ['极版', '9']])
  assert.deepEqual(extractScores('游戏体验：8/10\n白金体验：6.5/10').map(s => s.label), ['游戏体验', '白金体验'])
  assert.equal(extractScores('5/10 标题\n如果不用刷，我可能会给6分').length, 1)
})
test('中文分数保留原有精度和范围，不猜分母或给厂商的分数', () => {
  assert.deepEqual(extractScores('10分给游戏，0分给SEGA').map(s => [s.label, s.value, s.scale]), [['总评', '10', undefined]])
  assert.equal(extractScores('游戏本身8.5分以上')[0].qualifier, '以上')
  assert.deepEqual(extractScores('画面、配乐、剧情、体量我可以给9-10分，但战斗我只能给6分。').map(s => [s.label, s.value]), [['画面、配乐、剧情、体量', '9-10'], ['战斗', '6']])
  assert.equal(extractScores('剧情总的来说8/10，但是画面很好')[0].label, '剧情')
})
test('维度标题只有在明确的评分上下文中继承分母', () => {
  assert.deepEqual(extractScores('剧情 9'), [])
  assert.deepEqual(extractScores('8/10 好游戏\n剧情 9\n战斗系统 7').map(s => [s.label, s.scale]), [['总评', 10], ['剧情', 10], ['战斗系统', 10]])
})
test('保留五分制和百分制，并拒绝超出量表的值', () => {
  assert.equal(extractScores('85/100')[0].scale, 100)
  assert.equal(extractScores('4.5/5')[0].value, '4.5')
  assert.deepEqual(extractScores('11/10\n100.5/100\n6/5'), [])
})
test('官方名称与评分在构建时叠加，不改原文，过期的人工评分证据会报错', () => {
  const data = { games: [{ steamAppId: '1', title: 'Original', reviews: [{ id: 'r', content: '9/10 原话' }] }] }
  const out = enrichJournal(data, { '1': { title: '官方中文', source: 'https://store.steampowered.com/app/1/?l=schinese' } })
  assert.equal(out.games[0].title, '官方中文')
  assert.equal(out.games[0].originalTitle, 'Original')
  assert.equal(out.games[0].reviews[0].scores[0].value, '9')
  assert.equal(data.games[0].title, 'Original')
  assert.equal(out.games[0].reviews[0].content, data.games[0].reviews[0].content)
  assert.throws(() => enrichJournal(data, {}, { r: [{ value: '8', label: '总评', scale: 10, evidence: '8/10' }] }), /评分证据已变化/)
})
