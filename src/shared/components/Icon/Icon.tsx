import type { CSSProperties } from 'react';
import { assets } from '@/shared/assets';
import { cx, withDefaults } from '@/shared/utils';
import { iconDefaults, iconStroke, iconViewBox } from './Icon.defaults';
import type { IconProps } from './Icon.types';
import styles from './Icon.module.css';

export const Icon = (props: IconProps) => {
  const { name, size, color, flip, label } = withDefaults(iconDefaults, props);
  const mirrored = flip ?? assets.directionalIcons.includes(name);
  const style = { '--icon-size': size, '--icon-color': color } as CSSProperties;

  return (
    <svg
      viewBox={iconViewBox}
      className={cx(styles.icon, mirrored && styles.flip)}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={iconStroke.width}
      strokeLinecap={iconStroke.linecap}
      strokeLinejoin={iconStroke.linejoin}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {assets.icons[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
};
