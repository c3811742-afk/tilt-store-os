import type { ReactNode } from 'react';

export interface Tab<T extends string = string> {
  value: T;
  label: ReactNode;
  count?: number; // a small number after the label (e.g. waiting items)
}

export interface TabsProps<T extends string = string> {
  tabs?: Tab<T>[];
  value?: T; // the open tab; the first one when not set
  onChange?: (value: T) => void;
  label?: string; // accessible name of the tab list
  children?: ReactNode; // the open tab's content
  panelGap?: string; // the space between the blocks in the open tab (a message and a card, say)
}
