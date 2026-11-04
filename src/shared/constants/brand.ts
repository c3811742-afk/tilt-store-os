import { assets } from '@/shared/assets';

// The brand layer: this file and the logo are what make tilt-store-os and tilt-genz-store-os different.
// The full list of files that may differ is in CLAUDE.md ("Two repos, one codebase"); everything else stays identical.
export const brand = {
  id: 'tilt-store-os', // prefixes storage keys
  name: 'TILT', // shown in the page title and as the logo's accessible name
  logo: {
    src: assets.logo,
    aspectRatio: '578 / 357', // the logo file's width / height
  },
} as const;
