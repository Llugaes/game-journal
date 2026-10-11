import test from 'node:test'
import assert from 'node:assert/strict'
import { applyEditorial, updateEditorial } from '../editorial.mjs'

const empty = () => ({ version: 1, games: {} })
const sample = () => ({ games: [{ id: 'steam-123', title: '原名', categories: [], notes: [], reviews: [{ id: 'review-1', content: '8/10\n原始评测', verdict: '推荐', scores: [{ label: '总评', value: '8', scale: 10, evidence: '8/10' }] }], screenshots: [{ id: 'shot-1', src: 'media/steam/a.webp', width: 100, height: 100, date: '2026-10-01', caption: '原始说明', comments: [{ id: 'comment-1', content: '原始留言' }] }] }] })
test('手写字段独立保存，后续新截图和留言继续合入', () => {
  const base = sample(), edited = structuredClone(base.games[0]);
  edited.title = '中文名'; edited.screenshots[0].caption = '我的修改';
  const result = updateEditorial(base, empty(), [edited]);
  assert.equal(base.games[0].title, '原名');
  base.games[0].screenshots.push({ ...base.games[0].screenshots[0], id: 'shot-2' });
  base.games[0].screenshots[0].comments.push({ id: 'comment-2', content: '后来写的留言' });
  const merged = applyEditorial(base, result.editorial).games[0];
  assert.equal(merged.title, '中文名'); assert.equal(merged.screenshots[0].caption, '我的修改');
  assert.equal(merged.screenshots.length, 2); assert.equal(merged.screenshots[0].comments.length, 2);
});
test('修改评测后重新识别评分，不保留失效证据', () => {
  const base = sample(), edited = structuredClone(base.games[0]); edited.reviews[0].content = '6.5/10\n新的看法';
  assert.equal(updateEditorial(base, empty(), [edited]).data.games[0].reviews[0].scores[0].value, '6.5');
});
test('明确的独立十分制分数不需要伪造评测原话', () => {
  const base = sample(), edited = structuredClone(base.games[0]); edited.personalScores = [{ label: '总评', value: '9.2', scale: 10 }];
  const saved = updateEditorial(base, empty(), [edited]);
  assert.equal(saved.data.games[0].personalScores[0].value, '9.2');
  assert.equal(saved.data.games[0].reviews[0].content, '8/10\n原始评测');
  edited.personalScores = []; assert.deepEqual(updateEditorial(base, empty(), [edited]).data.games[0].personalScores, []);
  delete edited.personalScores; assert.deepEqual(updateEditorial(base, saved.editorial, [edited]).editorial.games, {});
});
test('移除和排序按稳定 ID 保存，新来源图片不会丢失', () => {
  const base = sample(); base.games[0].screenshots.push({ ...base.games[0].screenshots[0], id: 'shot-2' }, { ...base.games[0].screenshots[0], id: 'shot-3' });
  const edited = structuredClone(base.games[0]); edited.screenshots = [edited.screenshots[2], edited.screenshots[0]];
  const patch = updateEditorial(base, empty(), [edited]).editorial;
  base.games[0].screenshots.push({ ...base.games[0].screenshots[0], id: 'shot-4' });
  assert.deepEqual(applyEditorial(base, patch).games[0].screenshots.map(x => x.id), ['shot-3', 'shot-1', 'shot-4']);
});
test('修改留言保留其他原始留言，且不改变来源', () => {
  const base = sample(), edited = structuredClone(base.games[0]); edited.screenshots[0].comments[0].content = '重新措辞';
  const patch = updateEditorial(base, empty(), [edited]).editorial;
  base.games[0].screenshots[0].comments.push({ id: 'comment-2', content: '之后新增' });
  assert.deepEqual(applyEditorial(base, patch).games[0].screenshots[0].comments.map(c => c.content), ['重新措辞', '之后新增']);
});
test('新增游戏与空随笔等不完整输入有明确校验', () => {
  const game = { id: 'game-new', title: '新游戏', categories: [' 动作 '], reviews: [], screenshots: [], notes: [] };
  assert.equal(updateEditorial(sample(), empty(), [game]).data.games.length, 2);
  game.notes = [{ id: 'note-1', date: '2026-02-30', createdAt: '2026-10-11', feeling: '记录' }];
  assert.throws(() => updateEditorial(sample(), empty(), [game]), /日期非法/);
});
test('拒绝越界分数、非法字段及原型键', () => {
  const base = sample(), edited = structuredClone(base.games[0]); edited.personalScores = [{ label: '总评', value: '11', scale: 10 }];
  assert.throws(() => updateEditorial(base, empty(), [edited]), /评分超出/);
  assert.throws(() => applyEditorial(base, { version: 1, games: { 'steam-123': { fields: { source: 'evil' } } } }), /不可编辑/);
  assert.throws(() => applyEditorial(base, JSON.parse('{"version":1,"games":{"__proto__":{"fields":{}}}}')), /ID 非法/);
});
