export interface SegmentedControlProps<T extends string = string> {
  options?: { value: T; label: string }[];
  value?: T;
  onChange?: (value: T) => void;
  label?: string; // accessible name of the group
}
