import type { MouseEventHandler, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'muted' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  background?: string; // overrides the variant's background
  hoverBackground?: string; // overrides the variant's hover background
  color?: string; // overrides the variant's text color
  borderColor?: string; // overrides the variant's border color
  radius?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string; // an outside link (e.g. WhatsApp): the button opens it in a new tab. App pages use routes, not this.
}
