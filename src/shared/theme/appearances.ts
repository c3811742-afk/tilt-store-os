export const appearances = ['light', 'dark'] as const;

export type Appearance = (typeof appearances)[number];

export const defaultAppearance: Appearance = 'light';

export const isAppearance = (value: unknown): value is Appearance =>
  typeof value === 'string' && (appearances as readonly string[]).includes(value);

// The appearance after `current`, cycling through all appearances (used by the light/dark switch).
export const nextAppearance = (current: Appearance): Appearance =>
  appearances[(appearances.indexOf(current) + 1) % appearances.length];

const darkSchemeQuery = '(prefers-color-scheme: dark)';

// The user's system setting, used when they haven't picked an appearance yet.
export const systemAppearance = (): Appearance =>
  window.matchMedia(darkSchemeQuery).matches ? 'dark' : defaultAppearance;
