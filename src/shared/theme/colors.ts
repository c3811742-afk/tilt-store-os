import type { Appearance } from './appearances';

// Raw palette from "GenZ_Style_Directions.pdf", direction A (Calm and clean), light and dark.
// Values marked "derived" are not in the PDF; they were added for states it doesn't show.
// Components must not use the palette directly: use the semantic `colors` instead.
export const palette = {
  white: '#FFFFFF',

  // Brand: Gen Z green and mint (from their logo files)
  green: '#004422',
  greenDark: '#00331A', // derived: hover on green buttons
  mint: '#ECFFEC',
  mintDark: '#D2F2D2', // derived: hover on mint buttons

  // Light neutrals
  gray50: '#F6F7F8',
  gray200: '#E4E7EB',
  gray500: '#6B7280',
  gray600: '#4B5563',
  ink: '#0F1A14',

  // Dark neutrals (deep green-black)
  night950: '#0A0F0C',
  night900: '#0C110E',
  night850: '#101613',
  night800: '#141B17',
  night700: '#1B2620', // derived: active menu tint on dark
  night600: '#25302A',
  sage400: '#8C9891',
  sage200: '#B8C4BD', // derived: secondary text on dark
  sage50: '#E9F0EB',

  // Meaning colors
  teal: '#0E7C86',
  tealLight: '#4CC9B0',
  red: '#B42318',
  redLight: '#F97066',
  amber: '#B54708', // derived
  amberLight: '#FDB022', // derived
} as const;

// Semantic colors. Components use these names; each appearance fills in every one.
export interface Colors {
  primary: string; // main action: buttons and the active menu item
  primaryHover: string;
  onPrimary: string;
  brand: string; // brand moments: avatars, small brand marks
  onBrand: string;
  brandSoft: string; // soft tint: active menu, highlights
  onBrandSoft: string;
  background: string; // sidebar, header, login
  canvas: string; // main content area behind the cards
  surface: string; // cards, tables, inputs
  surfaceMuted: string; // tiles inside cards, muted buttons
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  focus: string;
  success: string; // teal, so it never looks like a brand button
  onSuccess: string;
  danger: string;
  onDanger: string;
  warning: string;
  onWarning: string;
  overlay: string;
  printPaper: string; // receipts, barcodes and QR codes: white paper and black ink in both appearances, so they scan
  printInk: string;
}

const light: Colors = {
  primary: palette.green,
  primaryHover: palette.greenDark,
  onPrimary: palette.mint,

  brand: palette.green,
  onBrand: palette.mint,
  brandSoft: palette.mint,
  onBrandSoft: palette.green,

  background: palette.white,
  canvas: palette.gray50,
  surface: palette.white,
  surfaceMuted: palette.gray50,

  text: palette.ink,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,

  border: palette.gray200,
  borderStrong: palette.gray500,
  focus: palette.green,

  success: palette.teal,
  onSuccess: palette.white,
  danger: palette.red,
  onDanger: palette.white,
  warning: palette.amber,
  onWarning: palette.white,

  overlay: 'rgba(15, 26, 20, 0.5)',
  printPaper: palette.white,
  printInk: palette.ink,
};

// Dark: mint takes over as the action color, because dark green disappears on dark backgrounds.
// Green stays for avatars and small brand moments.
const dark: Colors = {
  primary: palette.mint,
  primaryHover: palette.mintDark,
  onPrimary: palette.green,

  brand: palette.green,
  onBrand: palette.mint,
  brandSoft: palette.night700,
  onBrandSoft: palette.mint,

  background: palette.night900,
  canvas: palette.night950,
  surface: palette.night850,
  surfaceMuted: palette.night800,

  text: palette.sage50,
  textSecondary: palette.sage200,
  textMuted: palette.sage400,

  border: palette.night600,
  borderStrong: palette.sage400,
  focus: palette.mint,

  success: palette.tealLight,
  onSuccess: palette.night900,
  danger: palette.redLight,
  onDanger: palette.night900,
  warning: palette.amberLight,
  onWarning: palette.night900,

  overlay: 'rgba(0, 0, 0, 0.6)',
  printPaper: palette.white,
  printInk: palette.ink,
};

export const colorsByAppearance: Record<Appearance, Colors> = { light, dark };
