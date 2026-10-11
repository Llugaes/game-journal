// Deliberate rating bands: a five is negative, not the midpoint of a rainbow.
const tones = [
  { below: .6, tone: 'crimson', color: '#c82f49', highlight: '#ff8190', shadow: '#851b35' },
  { below: .7, tone: 'ember', color: '#d74c2e', highlight: '#ffa078', shadow: '#97351f' },
  { below: .8, tone: 'amber', color: '#bc7a19', highlight: '#f6ce7c', shadow: '#83521c' },
  { below: .9, tone: 'teal', color: '#238d83', highlight: '#83dacc', shadow: '#146159' },
  { below: Infinity, tone: 'emerald', color: '#16865b', highlight: '#79e0b0', shadow: '#0d5c3f' },
];
const neutral = { tone: 'neutral', color: '#788078', highlight: '#c3ccc3', shadow: '#505c50' };

export function scoreDisplay(value, scale = 10) {
  const values = (String(value).match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const denominator = Number(scale) > 0 ? Number(scale) : 10;
  const clamp = number => Math.max(0, Math.min(1, number / denominator));
  const lower = values.length ? clamp(Math.min(...values)) : 0;
  const upper = values.length ? clamp(Math.max(...values)) : 0;
  const { tone, color, highlight, shadow } = values.length ? tones.find(entry => lower < entry.below) : neutral;
  return { lower, upper, tone, color, highlight, shadow };
}
