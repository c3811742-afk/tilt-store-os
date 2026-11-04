export type BrandLogoSize = 'sm' | 'md' | 'lg';

export interface BrandLogoProps {
  size?: BrandLogoSize; // sets the height; the width follows the logo's shape
  color?: string;
  label?: string; // accessible name
}
