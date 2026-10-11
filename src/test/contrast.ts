/** Luminância relativa e razão de contraste WCAG 2.x, para os testes de tema. Aceita `#rgb`, `#rrggbb` e `rgb()/rgba()`. */
export const channels = (color: string): [number, number, number] => {
  const rgb = color.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

export const luminance = (color: string): number => {
  const [r, g, b] = channels(color).map((value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Cor resultante de `overlay` (com alfa, `rgba(r, g, b, a)`) sobre `base` opaca — como o browser compõe um fundo translúcido. */
export const blend = (overlay: string, base: string): string => {
  const alphaMatch = overlay.match(/^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
  const a = alphaMatch ? Number(alphaMatch[1]) : 1;
  const [or, og, ob] = channels(overlay);
  const [br, bg, bb] = channels(base);
  const mix = (o: number, b: number) => Math.round(o * a + b * (1 - a));
  return `rgb(${mix(or, br)}, ${mix(og, bg)}, ${mix(ob, bb)})`;
};

export const AA_TEXT = 4.5;
