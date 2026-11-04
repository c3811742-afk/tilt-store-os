import type { CSSProperties } from 'react';
import { brand } from '@/shared/constants';
import { withDefaults } from '@/shared/utils';
import { brandLogoDefaults, brandLogoHeights } from './BrandLogo.defaults';
import type { BrandLogoProps } from './BrandLogo.types';
import styles from './BrandLogo.module.css';

// The logo file is used as a mask, so it takes any theme color and follows light/dark.
export const BrandLogo = (props: BrandLogoProps) => {
  const { size, color, label } = withDefaults(brandLogoDefaults, props);

  const style = {
    '--brand-logo-image': `url(${brand.logo.src})`,
    '--brand-logo-aspect-ratio': brand.logo.aspectRatio,
    '--brand-logo-height': brandLogoHeights[size],
    '--brand-logo-color': color,
  } as CSSProperties;

  return <span className={styles.logo} style={style} role="img" aria-label={label} />;
};
