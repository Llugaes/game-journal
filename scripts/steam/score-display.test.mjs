import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreDisplay } from '../score-display.mjs';

test('评分按满分归一化，前后端可共用同一弧长与颜色', () => {
  assert.deepEqual(scoreDisplay('4.5', 5), scoreDisplay('9', 10));
  assert.deepEqual(scoreDisplay('90', 100), scoreDisplay('9', 10));
  assert.equal(scoreDisplay('5').lower, .5);
  assert.equal(scoreDisplay('10').lower, 1);
  assert.equal(scoreDisplay('0').lower, 0);
  assert.notEqual(scoreDisplay('2').color, scoreDisplay('5').color);
  assert.notEqual(scoreDisplay('5').color, scoreDisplay('9').color);
});
test('区间保留上下界，空白与越界不会生成无效弧长', () => {
  assert.deepEqual(scoreDisplay('8-9'), { lower: .8, upper: .9, color: scoreDisplay('8').color });
  assert.equal(scoreDisplay('').lower, 0);
  assert.equal(scoreDisplay('12').upper, 1);
});
