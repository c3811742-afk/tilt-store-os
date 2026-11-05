import type { Localized } from '@/shared/types';

export interface LocalizedFieldProps {
  label?: string;
  value?: Localized;
  onChange?: (value: Localized) => void;
  error?: string;
  required?: boolean;
}
