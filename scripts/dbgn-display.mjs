import { scoreDisplay } from './score-display.mjs';
import { renderBadge } from 'dbgn-score-badge';

export function badgeValue(score) {
  const value = score.value.trim();
  return score.scale === 10 && /^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(value) ? value : null;
}

export function renderShelfBadge(value) {
  return renderBadge(value)
    .replace(/<text [^>]*>\/10<\/text>/, '')
    .replace(/<text x="160" y="175"[^>]*font-size="72"[^>]*>[\d.]+<\/text>/,
      text => text.replace('y="175"', 'y="188"').replace('font-size="72"', 'font-size="105"'));
}

export function barDisplay(score) {
  const { lower, upper } = scoreDisplay(score.value, score.scale);
  return { lower, upper, tone: lower >= 1 ? 'perfect' : lower <= .6 ? 'red' : 'pink' };
}
