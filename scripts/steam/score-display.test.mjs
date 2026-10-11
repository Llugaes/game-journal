import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreDisplay } from '../score-display.mjs';

test('评分按满分归一化，前后端可共用同一弧长与颜色', () => {
  assert.deepEqual(scoreDisplay('4.5', 5), scoreDisplay('9', 10));
  assert.deepEqual(scoreDisplay('90', 100), scoreDisplay('9', 10));
  assert.equal(scoreDisplay('5').lower, .5);
  assert.equal(scoreDisplay('10').lower, 1);
  assert.equal(scoreDisplay('0').lower, 0);
  assert.equal(scoreDisplay('2').tone, 'crimson');
  assert.equal(scoreDisplay('5').tone, 'crimson');
  assert.notEqual(scoreDisplay('5').color, scoreDisplay('9').color);
});
test('区间保留上下界，空白与越界不会生成无效弧长', () => {
  assert.deepEqual(scoreDisplay('8-9'), { ...scoreDisplay('8'), upper: .9 });
  assert.equal(scoreDisplay('').lower, 0);
  assert.equal(scoreDisplay('12').upper, 1);
});
test('配色按评价分档，五分仍红色，六七八九分各有独立色调', () => {
  assert.equal(scoreDisplay('5.9').tone, 'crimson');
  assert.deepEqual([6, 7, 8, 9, 10].map(value => scoreDisplay(value).tone), ['ember', 'amber', 'teal', 'emerald', 'emerald']);
  assert.equal(scoreDisplay('').tone, 'neutral');
});
