import type { ReactNode } from 'react';

export interface SearchBoxItem {
  key: string;
  label: ReactNode;
  detail?: ReactNode; // a muted second line
  image?: string; // a small photo before the label
  imageName?: string; // the photo's alt text and fallback letter
}

export interface SearchBoxProps {
  label?: string; // the accessible name of the search field
  placeholder?: string;
  value?: string; // what is typed
  onChange?: (value: string) => void;
  items?: SearchBoxItem[]; // the results for what is typed
  onSelect?: (item: SearchBoxItem) => void; // a result was chosen (Enter chooses the first)
  onSubmit?: (value: string) => void; // Enter, when set (e.g. a scanned barcode); replaces choosing the first result
  loading?: boolean;
  emptyText?: ReactNode; // shown when something is typed and nothing matches
  width?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'search';
  autoFocus?: boolean;
  listPosition?: 'overlay' | 'inline'; // inline: the results push the content down (inside a scrolling panel, where an overlay would be cut off)
}
