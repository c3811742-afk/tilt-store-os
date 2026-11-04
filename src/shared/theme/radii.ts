// Direction A: square-ish corners. `md` (8px) is the default for buttons, cards and inputs.
export const radii = {
  none: '0',
  sm: '0.25rem', // 4, tags and small badges
  md: '0.5rem', // 8, the default
  lg: '0.75rem', // 12, the outer app frame and modals
  pill: '999rem',
  full: '50%', // avatars, circular badges
} as const;
