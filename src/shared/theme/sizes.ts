import { spacing } from './spacing';

// Default widths and heights. Fixed sizes are in rem (they scale with the root font size);
// layout sizes are relative to the viewport (%, vw, dvh) so pages adapt to any screen.
export const sizes = {
  container: {
    width: '100%',
    maxWidth: '75rem', // 1200
    paddingX: `clamp(${spacing[4]}, 4vw, ${spacing[5]})`,
  },
  viewport: {
    fullHeight: '100dvh',
    heroMinHeight: '60dvh',
  },
  sidebar: { width: 'clamp(13rem, 18vw, 15rem)' }, // the app's side menu
  modal: { width: 'min(90vw, 32rem)', maxHeight: '85dvh' },
  header: { height: '3.5rem' }, // 56
  logo: { height: { sm: '1.25rem', md: '1.75rem', lg: '3rem' } }, // 20 / 28 / 48; width follows the logo's shape

  button: {
    height: { sm: '2rem', md: '2.5rem', lg: '3rem' }, // 32 / 40 / 48
    paddingX: spacing[4],
    gap: spacing[2],
  },
  input: { height: '2.5rem', paddingX: spacing[3] }, // 40
  tag: { height: '1.375rem', paddingX: spacing[2] }, // 22
  card: { padding: spacing[4], minWidth: 'min(15rem, 100%)' }, // 240, never wider than its column
  avatar: { sm: '2rem', md: '3rem', lg: '4rem', xl: '6rem' }, // 32 / 48 / 64 / 96
  icon: { sm: '1rem', md: '1.5rem', lg: '2rem' }, // 16 / 24 / 32
  spinner: { size: '2.5rem' }, // 40
  stateMessage: { minHeight: '40dvh', maxWidth: '32rem' }, // loading / error / empty / not found

  aspectRatio: {
    square: '1 / 1',
    product: '4 / 5', // product photos
  },
} as const;
