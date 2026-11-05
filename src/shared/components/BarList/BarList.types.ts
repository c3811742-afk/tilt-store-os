export interface BarListItem {
  key: string;
  label: string;
  value: number; // sets the bar's length, relative to the largest value
  display: string; // the value as shown, already formatted
  detail?: string; // a muted note after the value (e.g. "12%")
  to?: string; // the row links to the page behind it
}

export interface BarListProps {
  items?: BarListItem[];
  color?: string; // the bars' color
  label?: string; // accessible name of the list
}
