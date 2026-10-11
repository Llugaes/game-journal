// The whole filled arc changes colour with the score; the empty track stays neutral.
export function scoreDisplay(value, scale = 10) {
  const values = (String(value).match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const denominator = Number(scale) > 0 ? Number(scale) : 10;
  const clamp = number => Math.max(0, Math.min(1, number / denominator));
  const lower = values.length ? clamp(Math.min(...values)) : 0;
  const upper = values.length ? clamp(Math.max(...values)) : 0;
  const hue = lower <= .5 ? lower * 76 : 38 + (lower - .5) * 204;
  return { lower, upper, color: values.length ? `hsl(${Math.round(hue)} 60% 38%)` : '#788078' };
}
