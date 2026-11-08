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
  modal: { width: 'min(90vw, 32rem)', wide: 'min(94vw, 48rem)', maxHeight: '85dvh' }, // wide: forms with a list of items, or editing a data record (IT admin)
  header: { height: '3.5rem' }, // 56
  logo: { height: { sm: '1.25rem', md: '1.75rem', lg: '3rem' } }, // 20 / 28 / 48; width follows the logo's shape

  button: {
    height: { sm: '2rem', md: '2.25rem', lg: '2.75rem' }, // 32 / 36 / 44
    paddingX: spacing[4],
    gap: spacing[2],
  },
  input: { height: '2.25rem', paddingX: spacing[3] }, // 36, the same as a button
  tag: { height: '1.25rem', paddingX: spacing[2] }, // 20
  card: { padding: spacing[4], minWidth: 'min(15rem, 100%)' }, // 16 / 240, never wider than its column
  avatar: { sm: '2rem', md: '3rem', lg: '4rem', xl: '6rem' }, // 32 / 48 / 64 / 96
  icon: { sm: '1rem', md: '1.5rem', lg: '2rem' }, // 16 / 24 / 32
  spinner: { size: '2.5rem' }, // 40
  stateMessage: { minHeight: '40dvh', maxWidth: '32rem' }, // loading / error / empty / not found
  tapTarget: '2.25rem', // 36, icon-only buttons, the same height as a button
  statCard: { minHeight: 'auto', minWidth: 'min(12rem, 100%)' }, // as tall as its content / 192: four figures fit in one row on a laptop
  table: { firstColumn: 'min(14rem, 40%)', thumbnail: '2.5rem' }, // 224 / 40
  field: { maxWidth: '28rem', narrow: '10rem', textareaHeight: '6rem', qty: '6rem', wide: 'min(28rem, 100%)' }, // 448 / 160 / 96 / 96 (a quantity in a list); wide: a search field in a filter bar, never wider than the screen
  bar: { height: '0.5rem', chartHeight: '10rem', columnWidth: '1.5rem', columnSlot: '4rem' }, // 8 / 160 / 24 / 64: bar lists, the column chart, its widest column and the most room a column gets
  badgeDot: '0.5rem', // 8, the "new" dot on the notifications bell
  timeline: { dot: '0.75rem' }, // 12, one step of a transfer or order timeline
  thumbnail: { sm: '2.5rem', md: '4rem', lg: '8rem' }, // 40 / 64 / 128: product photos and brand logos
  menu: { minWidth: '14rem', maxHeight: '60dvh' }, // 224, dropdown menus
  signature: { height: '8rem' }, // 128, signature pad
  pageMaxWidth: '90rem', // 1440, the owner's pages
  searchBox: { maxWidth: '26rem' }, // 416, the product search in the top bar
  pinPad: { key: '3.5rem', dot: '0.75rem' }, // 56 / 12: the PIN keypad on shared tills
  barcode: { height: '3rem', maxWidth: '16rem' }, // 48 / 256: the receipt number's barcode
  qrCode: '7rem', // 112: the tax QR code on receipts
  receipt: { width: '20rem' }, // 320, about the width of 80 mm receipt paper
  counter: { cart: 'clamp(20rem, 30vw, 26rem)', product: '10rem', chip: '2rem', stepper: '6.5rem' }, // the cashier's sell screen: cart panel, product card, size chip, quantity stepper

  aspectRatio: {
    square: '1 / 1',
    product: '4 / 5', // product photos
    video: '16 / 9', // help videos
  },
} as const;
