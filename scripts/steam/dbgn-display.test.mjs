import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBadge } from 'dbgn-score-badge';
import { badgeValue, barDisplay, renderShelfBadge } from '../dbgn-display.mjs';

test('猫头徽章使用原始十分制单值，不改写区间或其他量表', () => {
  for (const value of ['0', '6', '6.5', '8.5', '10']) {
    const selected = badgeValue({ value, scale: 10 });
    assert.equal(selected, value);
    assert.match(renderBadge(selected), /stroke-dasharray=/);
  }
  for (const score of [{ value: '6(8)', scale: 10 }, { value: '4.5', scale: 5 }, { value: '8', scale: undefined }, { value: '8.25', scale: 10 }]) assert.equal(badgeValue(score), null);
});

test('分项保留区间和量表比例，颜色与DBGN分档一致', () => {
  assert.deepEqual(barDisplay({ value: '6(8)', scale: 10 }), { lower: .6, upper: .8, tone: 'red' });
  assert.deepEqual(barDisplay({ value: '4.5', scale: 5 }), { lower: .9, upper: .9, tone: 'pink' });
  assert.equal(barDisplay({ value: '6.1', scale: 10 }).tone, 'pink');
  assert.equal(barDisplay({ value: '10', scale: 10 }).tone, 'perfect');
});

test('盒脊评分只调整可见数字，保留原图形和填充', () => {
  for (const [value, label] of [['6', '6.0'], ['8.5', '8.5'], ['10', '10']]) {
    const original = renderBadge(value);
    const spine = renderShelfBadge(value);
    const withoutText = svg => svg.replace(/<text [^>]*>[^<]*<\/text>/g, '');
    assert.equal(withoutText(spine), withoutText(original));
    assert.match(original, />\/10<\/text>/);
    assert.doesNotMatch(spine, />\/10<\/text>/);
    assert(spine.includes(`>${label}</text>`));
  }
});
