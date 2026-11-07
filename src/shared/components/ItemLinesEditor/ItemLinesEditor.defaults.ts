import type { ItemLinesEditorProps } from './ItemLinesEditor.types';

export const itemLinesEditorDefaults: Required<Pick<ItemLinesEditorProps, 'lines' | 'disabled' | 'autoFocus'>> = {
  lines: [],
  disabled: false,
  autoFocus: false,
};
