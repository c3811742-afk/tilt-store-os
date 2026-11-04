import { theme, type Theme } from './themes';

// Keys that describe the theme but are not CSS values.
const nonStyleKeys = ['locale', 'lang', 'dir', 'appearance', 'breakpoints'] as const;
// Groups whose children become top-level variables (`--font-size-md`, not `--typography-font-size-md`).
const flattenedKeys = ['typography'];

type StyleTokens = Omit<Theme, (typeof nonStyleKeys)[number]>;
type VarRefs<T> = { [K in keyof T]: T[K] extends object ? VarRefs<T[K]> : string };
type TokenTree = { [key: string]: string | number | TokenTree };

const toKebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// Theme path -> CSS variable name: ['colors', 'primary'] -> '--colors-primary'
const varName = (path: string[]) =>
  `--${path.filter((key) => !flattenedKeys.includes(key)).map(toKebab).join('-')}`;

const styleEntries = (node: object) =>
  Object.entries(node).filter(([key]) => !(nonStyleKeys as readonly string[]).includes(key));

const collectVariables = (node: object, path: string[], out: Record<string, string>) => {
  styleEntries(node).forEach(([key, value]) => {
    if (typeof value === 'object') collectVariables(value, [...path, key], out);
    else out[varName([...path, key])] = String(value);
  });
  return out;
};

const buildVarRefs = (node: object, path: string[]): TokenTree =>
  Object.fromEntries(
    styleEntries(node).map(([key, value]) => [
      key,
      typeof value === 'object' ? buildVarRefs(value, [...path, key]) : `var(${varName([...path, key])})`,
    ]),
  );

// Every theme value as a CSS variable: { '--colors-primary': '#403AFE', ... }
export const toCssVariables = (activeTheme: Theme) => collectVariables(activeTheme, [], {});

// Same shape as the theme, but each value is its CSS variable reference: vars.colors.primary === 'var(--colors-primary)'.
// Components and defaults use these, so they follow the active language and appearance, and a typo is a compile error.
export const vars = buildVarRefs(theme, []) as VarRefs<StyleTokens>;

// Writes the theme onto <html> as CSS variables and sets its lang, dir and color-scheme.
export const applyTheme = (activeTheme: Theme) => {
  const root = document.documentElement;
  Object.entries(toCssVariables(activeTheme)).forEach(([name, value]) => root.style.setProperty(name, value));
  root.lang = activeTheme.lang;
  root.dir = activeTheme.dir;
  root.style.colorScheme = activeTheme.appearance; // native scrollbars and form controls follow the appearance
};
