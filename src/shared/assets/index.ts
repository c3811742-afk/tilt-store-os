import logo from './logos/logo.png';
import { directionalIcons, icons } from './icons/icons';

// Asset registry: import every image and icon here and use it through `assets`, never by file path.
// Example: import heroImage from './images/hero.jpg'; then add `heroImage` below.
export const assets = {
  logo, // this repo's brand logo (see constants/brand.ts); black shape on transparent, colored by BrandLogo
  icons,
  directionalIcons,
} as const;

export type { IconName } from './icons/icons';
