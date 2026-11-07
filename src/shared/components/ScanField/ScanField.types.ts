import type { ReactNode } from 'react';

export interface ScanFieldProps {
  label?: ReactNode; // defaults to "Scan or search"
  hint?: ReactNode; // defaults to how to use it
  buttonLabel?: string; // defaults to "Find"
  onScan?: (code: string) => void; // the scanned or typed text, when Enter or the button is pressed
  disabled?: boolean;
  autoFocus?: boolean;
  width?: string;
  clearOnScan?: boolean; // empty the field after each scan, ready for the next one
}
