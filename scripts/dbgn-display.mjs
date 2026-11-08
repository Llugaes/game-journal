import { scoreDisplay } from './score-display.mjs';

export function badgeValue(score) {
  const value = score.value.trim();
  return score.scale === 10 && /^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(value) ? value : null;
}

export function barDisplay(score) {
  const { lower, upper } = scoreDisplay(score.value, score.scale);
  return { lower, upper, tone: lower >= 1 ? 'perfect' : lower <= .6 ? 'red' : 'pink' };
}
