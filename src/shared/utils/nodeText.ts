import { isValidElement } from 'react';
import type { ReactNode } from 'react';

// The words a piece of screen content shows (a cell holding a tag, a link or a line of text), for filtering a table
// by what its cells say. Content drawn by a component from its own props (a logo, a chart) has none.
export const nodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).filter(Boolean).join(' ');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return '';
};

// Arabic-Indic (and Persian) digits and separators as plain ones, so "١٬٢٣٤٫٥" reads as 1234.5.
const plainDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '')
    .replace(/−/g, '-');

// The number a formatted value shows ("EGP 1,234.50", "-12 pcs", "35%"), or null when it shows none.
export const numberIn = (value: string): number | null => {
  const match = /-?\d+(\.\d+)?/.exec(plainDigits(value).replace(/-\s+/g, '-'));
  return match ? Number(match[0]) : null;
};
