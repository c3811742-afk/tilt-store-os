import type { DefectReasonsProps } from './DefectReasons.types';

export const defectReasonsDefaults: Required<Pick<DefectReasonsProps, 'value' | 'required' | 'disabled'>> = {
  value: [],
  required: false,
  disabled: false,
};
