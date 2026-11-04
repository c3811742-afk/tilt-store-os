// Min-width breakpoints in em, so they follow the user's font size (mobile first).
export const breakpoints = {
  sm: 30, // 480
  md: 48, // 768
  lg: 64, // 1024
  xl: 80, // 1280
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const mediaQuery = (bp: Breakpoint) => `(min-width: ${breakpoints[bp]}em)`;

// Exposed to CSS modules as `@media (--md-up) { ... }` (see vite.config.ts).
export const customMedia = (Object.keys(breakpoints) as Breakpoint[])
  .map((bp) => `@custom-media --${bp}-up ${mediaQuery(bp)};`)
  .join('\n');
