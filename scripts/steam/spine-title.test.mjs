import test from 'node:test';
import assert from 'node:assert/strict';
import { spineTitle } from '../../src/lib/spine-title.ts';

test('盒脊主标题保留作品名中的序号和副标题', () => {
  assert.deepEqual(spineTitle('空之轨迹 the 2nd'), { name: '空之轨迹 the 2nd' });
  assert.deepEqual(spineTitle('空之轨迹 the 2nd 体验版'), {
    name: '空之轨迹 the 2nd', version: '体验版', qualifier: undefined,
  });
  assert.deepEqual(spineTitle('空之轨迹 the 1st 体验版').name, '空之轨迹 the 1st');
  assert.deepEqual(spineTitle('卧龙：苍天陨落 完全版（试玩版）').name, '卧龙：苍天陨落 完全版');
  assert.deepEqual(spineTitle('节奏天国：奇迹之星'), { name: '节奏天国：奇迹之星' });
});

test('版本限定语和版本标记分别排版', () => {
  for (const [title, name, version, qualifier] of [
    ['卧龙2：凤火连天（α体验版）', '卧龙2：凤火连天', '体验版', 'α'],
    ['最终幻想：共鸣（第一章抢先体验版）', '最终幻想：共鸣', '体验版', '首章抢先'],
    ['暗喻幻想：ReFantazio～序章试玩版～', '暗喻幻想：ReFantazio', '试玩版', '序章'],
    ['The Duskbloods（网络测试版）', 'The Duskbloods', '测试版', '网络'],
  ]) assert.deepEqual(spineTitle(title), { name, version, qualifier });

  assert.deepEqual(spineTitle('艾恩葛朗特 回荡新声 DEMO Version'), { name: '艾恩葛朗特 回荡新声', version: '体验版' });
  assert.deepEqual(spineTitle('纳克园: 最后的乐园 Playtest'), { name: '纳克园: 最后的乐园', version: '测试版' });
  assert.deepEqual(spineTitle('体验版'), { name: '体验版' });
});

test('盒脊省去书名号和与盒型重复的平台后缀', () => {
  assert.deepEqual(spineTitle('宝可梦传说 Z-A（Switch 2 版）', 'switch2'), { name: '宝可梦传说 Z-A' });
  assert.deepEqual(spineTitle('宝可梦传说 Z-A（Switch 2 版）', 'switch'), { name: '宝可梦传说 Z-A（Switch 2 版）' });
  assert.deepEqual(spineTitle('游戏（PS5 版）', 'ps5'), { name: '游戏' });
  assert.deepEqual(spineTitle('《恶意不息》', 'steam'), { name: '恶意不息' });
  assert.deepEqual(spineTitle('《剑星》体验版', 'steam'), { name: '剑星', version: '体验版', qualifier: undefined });
  assert.deepEqual(spineTitle('《新生也疯狂》第1季', 'steam'), { name: '新生也疯狂第1季' });
});
