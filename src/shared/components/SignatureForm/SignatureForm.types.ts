import type { ReactNode } from 'react';

export interface SignatureLine {
  variantId: string;
  label: string; // the product, size and colour
  detail?: string; // e.g. "Picked up 5"
}

export interface SignatureField {
  key: string; // e.g. 'qty', 'received', 'defects'
  label: string; // the column heading
  // The most this field can be for a line, given the row's other numbers (e.g. defects can't be more than received).
  // Typing more stops at the maximum, so the numbers on screen always add up.
  max?: (variantId: string, row: Record<string, number>) => number;
  blankZero?: boolean; // show an empty box (with the placeholder) instead of 0, for a number nobody has entered yet
  placeholder?: string;
}

// Quantities per product and field, the typed name and the confirmation tick.
export interface SignatureValue {
  quantities: Record<string, Record<string, number>>;
  name: string;
  confirmed: boolean;
}

export interface SignatureFormProps {
  lines?: SignatureLine[];
  fields?: SignatureField[]; // one number column per field; without fields only the name and tick are asked
  value?: SignatureValue;
  onChange?: (value: SignatureValue) => void;
  statement?: ReactNode; // what the signer agrees to, shown above the name
  errors?: { name?: string; confirmed?: string };
  disabled?: boolean;
  showSigner?: boolean; // false: only the quantities, without the name and the tick
}
