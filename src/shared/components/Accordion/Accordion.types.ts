import type { ReactNode } from 'react';

export interface AccordionItem {
  key: string;
  title: ReactNode; // the question or heading, always shown
  content: ReactNode; // shown when the item is opened
}

export interface AccordionProps {
  items?: AccordionItem[];
  emptyText?: ReactNode; // shown when there are no items (e.g. nothing matches a search)
}
