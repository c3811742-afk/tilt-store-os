// Fills {placeholders} in a text: fillText('{count} new', { count: '3' }) -> '3 new'
export const fillText = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
