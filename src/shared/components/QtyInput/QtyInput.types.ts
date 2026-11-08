export interface QtyInputProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string; // read by screen readers only: the column heading says it on screen
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  width?: string;
}
