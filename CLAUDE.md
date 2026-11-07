# Store System Demo (TILT version): Team Rules

React + TypeScript (Vite) demo of the store system (sales, stock, returns and brand settlements for a multi-branch concept store), styled with CSS Modules, in English and Arabic, in light and dark. These rules apply to every person and every AI session working in this repo. Follow them exactly.

## Requirements

- Node.js 24 and npm 11 (pinned in `.nvmrc` and `engines` in `package.json`; npm warns on other versions).
- VS Code with the recommended extensions in `.vscode/extensions.json` (Oxc, Stylelint, CSS Modules).

## Commands

- `npm run dev`: start the dev server
- `npm run check`: type-check, lint the code (oxlint) and lint the CSS (Stylelint). Must pass before every PR.
- `npm run build`: production build

## Deployment: GitHub Pages

- Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci` → `npm run check` → `npm run build` → deploy. If the check fails, nothing is deployed.
- The site is served from `https://c3811742-afk.github.io/tilt-store-os/`. The build uses that sub-path (`base` in `vite.config.ts`). If the repo is renamed, update `pagesBasePath` there.
- Routing uses `HashRouter` (URLs like `/#/stock/123`), because GitHub Pages can't serve a normal path like `/stock/123` on refresh. Always link with React Router (`<Link>`, `navigate()`) and paths from `routes.ts`, never a hard-coded `href`.
- Files in `public/` and assets are referenced through Vite (imports, or `import.meta.env.BASE_URL`), never by an absolute path like `/images/x.png`, which would break under the sub-path.

## Two repos, one codebase

This demo exists twice: `tilt-store-os` (TILT logo) and `tilt-genz-store-os` (Gen Z's logo). The two repos are identical except for the brand layer:

- `src/shared/constants/brand.ts`: brand id, name, logo aspect ratio
- `src/shared/assets/logos/logo.png`: the logo (black shape on transparent; `BrandLogo` colors it)
- `public/favicon.png`
- the repo name in `package.json` / `package-lock.json`, `pagesBasePath` in `vite.config.ts`, the `<title>` in `index.html`, and the title and site URL in this file

Any other change (a component, a page, a theme value, a text) must be made in **both** repos, in the same way. Never let them drift.

## Golden rules

1. **Nothing is implemented twice.** Before writing a component, hook, helper or style, search `src/shared/`. If it exists, use or extend it. If it doesn't exist and will be used more than once, create it in `src/shared/`.
2. **No hard-coded values.** No raw colors, font families, font sizes, spacing, radii, shadows, breakpoints, z-indexes, durations, asset paths or user-facing text inside components. Every value comes from a variable in `src/shared/`.
3. **Every shared component is fully configurable, with defaults.** Each prop has a default that lives in a separate defaults file and points to the theme. A caller can override any prop. A component used with no props must render correctly from its defaults.
4. **Duplicated logic becomes a shared method.** If the same piece of code (a calculation, formatting, filtering, a mock-data call, a validation) appears twice, move it into `src/shared/utils/` or `src/shared/hooks/` and import it from both places.
5. **Relative sizes only.** No `px`, anywhere in styles. Fixed sizes are `rem`; layout sizes are relative (`%`, `vw`, `dvh`, `clamp()`, `min()`); breakpoints are `em`. The whole demo must adapt to any screen size.

## Folder structure

```
src/
  app/                # app shell: App.tsx (routes), global.css, providers/
  shared/
    theme/            # the design system: single source of truth for all styling values
      colors.ts       # palette (raw), colors (semantic, one set per appearance: light / dark)
      typography.ts   # root font size, font families, sizes, weights, line heights, text styles (per language)
      spacing.ts
      sizes.ts        # default widths/heights: container, sidebar, header, logo, button, input, card, avatar, icon...
      radii.ts
      borders.ts
      shadows.ts      # none in this direction
      breakpoints.ts  # em breakpoints, exposed to CSS as @media (--md-up)
      zIndex.ts
      motion.ts
      opacity.ts
      locales.ts      # en / ar: language code and text direction
      appearances.ts  # light / dark
      themes.ts       # builds `themes.en.light`, `themes.ar.dark`...
      cssVariables.ts # turns the theme into CSS variables; exports `vars`
      index.ts
    components/       # reusable UI components, one folder each (Button, Text, BrandLogo...)
    assets/
      logos/          # logo.png: this repo's brand logo
      images/
      icons/
      index.ts        # asset registry: every asset is imported and exported here
    hooks/            # shared React hooks (useLocale, useAppearance...)
    utils/            # shared pure functions (withDefaults, cx, storage, formatters...)
    constants/        # brand, routes, storage keys
      text/
        en.ts         # every user-facing string in English
        ar.ts         # same keys, in Arabic
    types/            # shared TypeScript types (Branch, Brand, Product, Sale...)
    mocks/            # demo mock data
  features/
    common/           # pages shared by all users (HomePage, NotFoundPage, later the login)
    owner/            # one folder per role, as in "concept store os requirements.xlsx"
    manager/          # branch manager (optional role, to confirm)
    cashier/
    stock/            # stock person
    accountant/
```

- A component used by **one** feature only may live in that feature's folder. The moment a second feature needs it, move it to `src/shared/components/`. Never copy it.
- Feature folders compose shared components. They don't redefine styling values.

## Theme

The theme is direction **A. Calm and clean** from `GenZ_Style_Directions.pdf`: modern admin software, white space, soft greys, Gen Z green only where action or brand matters. Both repos use it; only the logo differs.

- **Type:** Inter for everything (IBM Plex Sans Arabic in Arabic). Sentence case. Only the small `label` style ("LOW STOCK") is uppercase. Numbers use `numeric.tabular` so columns line up.
- **Shape:** square-ish corners (`radii.md`, 8px), thin 1px lines, no shadows.
- **Color rules:** green (`primary`) for main buttons and the active menu item only. Success is teal, so it never looks like a brand button. Mint (`brandSoft`) is the soft tint behind highlights.
- **Light and dark:** every color has a light and a dark value. In dark, mint becomes the action color (mint buttons with green text) because dark green disappears on dark backgrounds; green stays for avatars and small brand moments. Components never branch on the appearance: they use the semantic colors and the switch happens through the CSS variables. Read it with `useAppearance()` only when logic needs it (e.g. the switch button label).
- **Logo:** always through the shared `BrandLogo` component, never an `<img>` of the logo. It uses the logo file as a mask, so it takes the theme color (green in light, mint in dark).
- All colors live in `theme/colors.ts`. Components use the semantic colors (`primary`, `textMuted`, `surface`, `canvas`, `danger`). Never use `palette` directly in a component; it exists only to feed the semantic names.
- All typography lives in `theme/typography.ts`. Prefer a named text style (`textStyles.h2`, or the shared `Text` component), or pick from the scales, never `14px`.
- Default widths and heights live in `theme/sizes.ts`.
- To add a value that doesn't exist yet, add it to the theme file first, then use it. Never put it inline "just this once".
- Don't change existing theme values without team agreement.

## Styling: CSS Modules + theme variables

The active theme is written onto `<html>` as CSS variables (by `ThemeProvider` → `applyTheme`). Each variable is named after its path in the theme, in kebab-case, with the `typography` level dropped:

- `theme.colors.primary` → `var(--colors-primary)`
- `theme.spacing[4]` → `var(--spacing-4)`
- `theme.sizes.button.height.md` → `var(--sizes-button-height-md)`
- `theme.typography.textStyles.h1.fontSize` → `var(--text-styles-h1-font-size)`

Rules:
- **In `.module.css` files**, use only these variables (or the component's own `--component-*` variables, see below).
- **In TypeScript** (defaults files, props), use `vars` from `@/shared/theme`: `vars.colors.primary` is the string `'var(--colors-primary)'`. It's typed, so a typo is a compile error. Don't write `'var(--...)'` strings by hand, and don't use raw `theme.*` values for styling (they wouldn't follow the language or appearance switch).
- **Breakpoints** in CSS: `@media (--sm-up)`, `(--md-up)`, `(--lg-up)`, `(--xl-up)`. Mobile first.
- **Class names** are camelCase (`.fullWidth`).
- `npm run lint:css` blocks `px`, hex and named colors, raw values for themed properties, and `left` / `right`.

## Bilingual: English and Arabic

The demo ships in English (left-to-right) and Arabic (right-to-left). Every screen must work in both.

- **Language-dependent values switch automatically.** Direction, fonts, line heights, letter spacing and uppercase differ per language; they're in the CSS variables, so components never branch on the language. Read the current language with `useLocale()` only when logic needs it (e.g. formatting).
- **No hard-coded text.** Every user-facing string is a key in `shared/constants/text/en.ts` and `ar.ts`, read through `useLocale().text`. `ar.ts` is typed against `en.ts`, so a missing key is a compile error.
- **Logical CSS only.** Use `margin-inline-start`, `padding-inline`, `inset-inline-start`, `border-inline-end`, `inline-size`, `block-size` and `text-align: start / end`. Never `left` / `right`, so the page mirrors automatically in Arabic.
- **Flip directional icons only.** Arrows, chevrons and back/next icons mirror in Arabic. Logos, play buttons, checkmarks and media don't.
- **Don't style text by language by hand.** Arabic must never be uppercased or letter-spaced. Use the text styles, which already handle this.
- **Format through shared helpers.** Numbers, prices (EGP, SAR or any branch currency), dates and file sizes go through `formatNumber`, `formatPrice`, `formatDate`, `formatFileSize` in `shared/utils` with the active locale.
- **Mixed content is normal.** An Arabic page may show an English item title. Font stacks already fall back across scripts; use `autoDirection` on `Text` for user-generated text (titles, descriptions, names).
- **Check both languages** before finishing any page.

## Error handling

Every feature handles failure. Nothing is written for the happy path only.

The building blocks already exist; use them instead of writing your own:
- `useAsync(load, deps)` (`shared/hooks`): loads data and tracks loading / error / empty / success, with `retry()`.
- `<AsyncContent state={...}>{(data) => ...}</AsyncContent>` (`shared/components`): renders the right state for a `useAsync` result.
- `LoadingState`, `ErrorState`, `EmptyState`: the shared state screens (all built on `StateMessage`), with default text in both languages.
- `safeAsync(call)` (`shared/utils`): runs any async call (e.g. a form submit) and returns `{ ok: true, data }` or `{ ok: false, error }` instead of throwing.
- `ErrorBoundary` (`shared/components`), already wrapped around the whole app in `src/app/AppErrorBoundary.tsx`.
- `NotFoundPage` (`features/common`), shown for any unknown path.

Rules:
- **Every data view has four states:** loading, error, empty and success. Load data with `useAsync` and render it with `AsyncContent`. Override a state only to give a more specific message (e.g. `empty={<EmptyState message={text.search.noResults} />}`).
- **Every async call can fail.** Use `useAsync` or `safeAsync`. Never leave a `.then()` without a `.catch()`, or an `await` without a `try` / `catch`.
- **Errors are never swallowed silently.** Either show the user something or deliberately ignore it with a comment saying why (see `storage.ts`).
- **The user sees a friendly message, not technical details.** Show text from the text files ("Something went wrong. Please try again."), never `error.message`, a stack trace or a status code. Log the details with `console.error` for developers.
- **Offer a way out.** Error states have a "Try again" action where retrying makes sense, or a link back to a safe page.
- **Forms validate before submitting.** Show the message next to the field it belongs to, keep what the user typed, and disable the submit button while a request is in progress, so it can't be sent twice.
- **Guard against bad data.** Handle missing or empty values (no image, no price, zero results) instead of assuming they exist. Unknown routes show a "Page not found" page.
- **Crashes don't blank the page.** The app-wide `ErrorBoundary` shows a friendly error screen and clears when the user navigates. Wrap any section that could fail on its own (e.g. a widget on a dashboard) in its own `ErrorBoundary`, so the rest of the page keeps working.

## UI wording

All text must read like a normal, well-known store or admin product (Shopify, Square, Odoo), not like AI-generated marketing.

- **Use the standard label for standard actions:** "Sign in", "Log out", "Search", "Save changes", "Cancel", "Delete", "Continue", "Back", "View all", "Export", "Print receipt". Don't invent new names for them.
- **Be short and plain.** Say what the thing does. A button is one to three words. A message is one sentence, two at most.
- **Avoid AI-sounding words:** unlock, elevate, seamless, effortless, empower, supercharge, unleash, revolutionize, dive in, embark, journey, curated, tailored, game-changer, cutting-edge, "take your … to the next level". No emojis, no exclamation marks, no em dashes.
- **Use sentence case** ("Low stock", not "Low Stock"). The uppercase `label` style comes from the text styles, so write the text normally.
- **Error and empty messages say what happened and what to do next:** "No items match 'denim'. Try a different keyword." or "We couldn't load this page. Please try again."
- **Arabic is written, not translated.** Use the Modern Standard Arabic terms Arabic-speaking users already know from common apps and sites (تسجيل الدخول، بحث، إلغاء، المخزون، المرتجعات), not a word-for-word translation of the English.
- **Same thing, same word, everywhere.** If it's called "brand" in one place, it isn't a "vendor" somewhere else. Reuse existing keys in the text files instead of adding new wording for the same thing.

## Shared component pattern

`src/shared/components/Button/` is the reference implementation. Every shared component has these five files. The only exceptions: a component with no styling of its own has no `module.css` (e.g. `ErrorState`), and one with no optional props has no `defaults` file (e.g. `AsyncContent`).

**`Button.types.ts`**: the props interface. Every prop is optional unless it truly can't have a default.

**`Button.defaults.ts`**: the defaults, all pointing to the theme through `vars`.
```ts
import { vars } from '@/shared/theme';

export const buttonVariants: Record<ButtonVariant, { background: string; color: string }> = {
  primary: { background: vars.colors.primary, color: vars.colors.onPrimary },
  // ...
};

export const buttonDefaults: Required<Pick<ButtonProps, 'variant' | 'size' | 'radius' | ...>> = {
  variant: 'primary',
  size: 'md',
  radius: vars.radii.md,
  // ...
};
```

**`Button.tsx`**: merges props over defaults with `withDefaults`, then hands the resolved values to the CSS module as `--button-*` custom properties.
```tsx
export const Button = (props: ButtonProps) => {
  const { children, variant, size, background, radius, ... } = withDefaults(buttonDefaults, props);
  const style = {
    '--button-background': background ?? buttonVariants[variant].background,
    '--button-radius': radius,
  } as CSSProperties;
  return <button className={styles.button} style={style}>{children}</button>;
};
```

**`Button.module.css`**: styles using only the component's `--button-*` variables and theme variables.
```css
.button {
  background: var(--button-background);
  border-radius: var(--button-radius);
  padding-inline: var(--sizes-button-padding-x);
}
```

**`index.ts`**: re-exports the component, its types and its defaults. Then add it to `shared/components/index.ts`.

Rules:
- Always merge with `withDefaults` (not `{ ...defaults, ...props }`), so a prop passed as `undefined` keeps its default.
- Override at the call site through props: `<Button variant="secondary" size="lg" />`. Never wrap a shared component just to restyle it, and never copy it to make a variant. Add a variant or prop to the shared one instead.
- Build bigger components from smaller shared ones (a `Card` uses the shared `Button`, `Text`, `Container`).
- Use `Text` for all text and `Container` for page width; don't restyle headings or containers per page.
- Join class names with `cx()` from `shared/utils`.

## Assets

- Every image and icon is in `src/shared/assets/` and is exported from `assets/index.ts`.
- Components import assets from the registry (`import { assets } from '@/shared/assets'`), never by a relative file path.
- Fonts are Google Fonts, loaded once in `<head>` from `fontsUrl` in `theme/typography.ts` (by `vite.config.ts`). Don't add font `<link>`s or `@import`s anywhere else.

## Code reuse

- Formatting, validation, filtering/sorting and mock-data access each belong in `shared/utils/` or `shared/hooks/`.
- Shared TypeScript types (`Branch`, `Brand`, `Product`, `Sale`, `User`) are defined once in `shared/types/`.
- Route paths are defined once in `shared/constants/routes.ts`. Storage keys in `shared/constants/storageKeys.ts`, and storage is accessed only through `storage` from `shared/utils`.
- All UI text goes in `shared/constants/text/` in both languages.

## Data, defaults and the mock API

- **Every configurable value has its default in one file: `shared/constants/defaults.ts`** (limits, VAT and receipt text per country, return rules, payment methods, reasons lists, default brand terms, alert and flag settings...). The owner changes them on the Policies and Settings pages; "Reset to defaults" brings back this file's values. Never put a default inside a page.
- **Mock API behaviour** (delay, failure rate, the live demo checkout, the seed) is in `shared/constants/mock.ts`.
- **All data goes through `shared/api/`**: `respond()` for reads, `mutate()` for changes (it saves to this browser, compressed, and tells every page through `onDataChange`). Every change calls `logActivity()`; alerts go through `notify()`. Pages never touch the data directly.
- **Business rules live once:** sale economics (`utils/economics.ts`), rates, VAT and brand terms on a date (`utils/rates.ts`), stock levels from movements (`utils/stockLevels.ts`), batch costs (`utils/costing.ts`), recording a sale (`api/engine.ts`), report facts (`api/facts.ts`) and brand settlements (`api/settlement.ts`). The seed, the live demo and every screen use them.
- **History is never rewritten:** sales keep a copy of their price, cost, commission, VAT rate and exchange rate; rates, VAT rates and brand terms are added from a date, never edited; stock only changes through movements; completed sales are reversed with a record, never edited.
- **Branch staff** (manager, storekeeper, driver, online orders) only reach their own branches: every call for them checks the branch with `assertBranch()` (`api/branchScope.ts`) and never returns cost, margin, commission or profit. Pages get the branch from `useBranchScope()`.
- **Demo data** (`shared/mocks/`): GenZ's real branches, brands and products (`catalog.ts`, researched from public sources); people's names, phone numbers and bank details are placeholders.

## TypeScript

- `strict` mode on. No `any`. Use `unknown` and narrow it when needed.
- Import through the `@/` alias, not long relative paths (`../../../`).
- Each folder exposes its public API through an `index.ts`.

## Before you open a PR (and before an AI session finishes)

- [ ] `npm run check` passes
- [ ] Searched `src/shared/` before creating anything new
- [ ] No raw color, font, size, spacing or asset path inside any component; no `px`
- [ ] Every new shared component has `types`, `defaults`, `module.css` and `index` files, and renders with zero props
- [ ] No duplicated logic: anything used twice is in `shared/`
- [ ] New theme values were added to the theme files, not inline
- [ ] No hard-coded text; new strings added to both `en.ts` and `ar.ts`
- [ ] Loading, error and empty states handled; every async call and form can fail gracefully
- [ ] Wording uses standard labels, is short and plain, and has no AI-sounding phrases
- [ ] No `left` / `right` in layout styles; the page checked in English and Arabic, light and dark, on a phone width and a desktop width
- [ ] The same change made in the other repo (`tilt-store-os` / `tilt-genz-store-os`), unless it's a brand-layer file
