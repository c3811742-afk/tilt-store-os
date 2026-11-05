import type { ReactNode } from 'react';

export interface PickedFile {
  name: string;
  size: number;
  dataUrl: string; // the file's content, kept with the record in the demo
}

export interface FileFieldProps {
  label?: ReactNode;
  accept?: string; // e.g. "image/*" or ".pdf,.xlsx"
  value?: PickedFile | null;
  onChange?: (file: PickedFile | null) => void;
  hint?: ReactNode;
  error?: string;
  width?: string;
}
