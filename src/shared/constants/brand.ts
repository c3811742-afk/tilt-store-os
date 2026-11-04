import { assets } from '@/shared/assets';

// The brand layer. This file and `assets/logos/logo.png` (plus `public/favicon.png`) are the ONLY
// differences between tilt-store-os and genz-store-os. Everything else stays identical in both repos.
export const brand = {
  id: 'tilt-store-os', // prefixes storage keys
  name: 'TILT', // shown in the page title and as the logo's accessible name
  logo: {
    src: assets.logo,
    aspectRatio: '578 / 357', // the logo file's width / height
  },
} as const;
