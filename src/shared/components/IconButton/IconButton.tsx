import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { iconButtonDefaults } from './IconButton.defaults';
import type { IconButtonProps } from './IconButton.types';
import styles from './IconButton.module.css';

// A square button with only an icon (edit, archive, the menu). Always has an accessible label.
export const IconButton = (props: IconButtonProps) => {
  const { icon, label, onClick, disabled, size, color, expanded } = withDefaults(iconButtonDefaults, props);
  const style = { '--icon-button-size': size, '--icon-button-color': color } as CSSProperties;
  return (
    <button
      type="button"
      className={styles.button}
      style={style}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon name={icon} />
    </button>
  );
};
