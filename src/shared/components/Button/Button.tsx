import type { CSSProperties } from 'react';
import { cx, withDefaults } from '@/shared/utils';
import { buttonDefaults, buttonHeights, buttonVariants } from './Button.defaults';
import type { ButtonProps } from './Button.types';
import styles from './Button.module.css';

export const Button = (props: ButtonProps) => {
  const {
    children,
    variant,
    size,
    background,
    hoverBackground,
    color,
    borderColor,
    radius,
    fullWidth,
    disabled,
    type,
    onClick,
    href,
  } = withDefaults(buttonDefaults, props);
  const variantStyle = buttonVariants[variant];

  // Resolved values are handed to the CSS module as custom properties.
  const style = {
    '--button-background': background ?? variantStyle.background,
    '--button-hover-background': hoverBackground ?? variantStyle.hoverBackground,
    '--button-color': color ?? variantStyle.color,
    '--button-border-color': borderColor ?? variantStyle.borderColor,
    '--button-height': buttonHeights[size],
    '--button-radius': radius,
  } as CSSProperties;

  if (href && !disabled) {
    return (
      <a className={cx(styles.button, fullWidth && styles.fullWidth)} style={style} href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={cx(styles.button, fullWidth && styles.fullWidth)}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
