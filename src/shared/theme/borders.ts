// Direction A: thin lines everywhere.
export const borderWidth = {
  none: '0',
  thin: '0.0625rem', // 1, every line and card edge
  thick: '0.125rem', // 2, focus rings
  accent: '0.1875rem', // 3, the green edge on a highlighted stat card
} as const;

export const borderStyle = 'solid';

export const borders = { width: borderWidth, style: borderStyle } as const;
