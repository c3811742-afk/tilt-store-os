import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode; // buttons at the end of the header
  back?: { to: string; label: string }; // a link back to the list the page belongs to
}
