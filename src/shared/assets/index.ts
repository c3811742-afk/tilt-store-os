import logo from './logos/logo.png';
import { directionalIcons, icons } from './icons/icons';
import helpOwner from './videos/help-owner.webm';
import helpIt from './videos/help-it.webm';
import helpManager from './videos/help-manager.webm';
import helpCashier from './videos/help-cashier.webm';
import helpBrandPartner from './videos/help-brandPartner.webm';

// Asset registry: import every image and icon here and use it through `assets`, never by file path.
// Example: import heroImage from './images/hero.jpg'; then add `heroImage` below.
export const assets = {
  logo, // this repo's brand logo (see constants/brand.ts); black shape on transparent, colored by BrandLogo
  icons,
  directionalIcons,
  // Help videos, one per role, recorded from this demo (src/shared/assets/videos). A role without one shows only its guide.
  helpVideos: { owner: helpOwner, it: helpIt, manager: helpManager, cashier: helpCashier, brandPartner: helpBrandPartner } as Partial<Record<'owner' | 'it' | 'manager' | 'cashier' | 'brandPartner', string>>,
} as const;

export type { IconName } from './icons/icons';
