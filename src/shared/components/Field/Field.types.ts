import type { ReactNode } from 'react';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode; // a muted line under the control
  error?: string; // shown under the control, in red; replaces the hint
  required?: boolean;
  id?: string; // the control's id; the label points to it
  width?: string; // the field's maximum width
  children?: ReactNode; // the control
}
