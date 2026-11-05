import type { ReactNode } from 'react';

export interface CardProps {
  children?: ReactNode;
  title?: ReactNode; // a heading at the top of the card
  actions?: ReactNode; // buttons next to the title
  as?: 'div' | 'article' | 'section' | 'li';
  to?: string; // app path (from routes.ts): the whole card is a link
  padding?: string;
  gap?: string; // space between the card's children
  background?: string;
  borderColor?: string;
  accentColor?: string; // a colored edge at the start of the card (e.g. a highlighted number)
  radius?: string;
}
