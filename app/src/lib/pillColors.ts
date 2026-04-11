export const PILL_COLORS = ['--le-lavender', '--le-teal', '--le-copper', '--le-gold', '--le-rose', '--le-accent'];

export function buildColorMap(keys: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  keys.forEach((k, i) => {
    map[k] = PILL_COLORS[i % PILL_COLORS.length];
  });
  return map;
}

export function pillBackground(colors: string[]): string | undefined {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) {
    return `color-mix(in srgb, var(${colors[0]}) 32%, transparent)`;
  }
  const step = 100 / colors.length;
  const stops = colors.map((c, i) => {
    const start = i * step;
    const end = (i + 1) * step;
    const mix = `color-mix(in srgb, var(${c}) 32%, transparent)`;
    return `${mix} ${start}%, ${mix} ${end}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
