import type { ReactNode } from 'react';

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode; // what the field is: an (i) beside the label (a muted line when there is no label)
  note?: ReactNode; // a rule the value must meet ("Use at least 8 characters"), shown under the control
  optional?: boolean; // shows "Optional" beside the label
  error?: string; // shown under the control, in red; replaces the hint
  required?: boolean;
  id?: string; // the control's id; the label points to it
  width?: string; // the field's maximum width
  children?: ReactNode; // the control
}
