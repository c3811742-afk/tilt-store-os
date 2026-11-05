import type { CSSProperties } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { thumbnailDefaults } from './Thumbnail.defaults';
import type { ThumbnailProps } from './Thumbnail.types';
import styles from './Thumbnail.module.css';

// A small square picture: a product photo, a brand logo or a person's photo. Falls back to the first letter.
export const Thumbnail = (props: ThumbnailProps) => {
  const { src, name, size, round } = withDefaults(thumbnailDefaults, props);
  return (
    <span className={cx(styles.thumbnail, round && styles.round)} style={{ '--thumbnail-size': size } as CSSProperties}>
      {src ? <img className={styles.image} src={src} alt={name} loading="lazy" /> : <span aria-hidden>{name.trim().charAt(0).toUpperCase()}</span>}
    </span>
  );
};
