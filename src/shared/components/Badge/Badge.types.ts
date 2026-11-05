import type { ReactNode } from 'react';

// success / warning / danger: a status (paid, waiting, failed). brand: the store's own things.
export type BadgeVariant = 'neutral' | 'info' | 'brand' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  radius?: string;
}
