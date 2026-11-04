// Enforces the CLAUDE.md styling rules in every CSS module:
// theme variables only, relative units only, start/end instead of left/right.
const physicalSides = [
  'left',
  'right',
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-left-color',
  'border-right-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
];

const themedProperties = [
  '/color$/',
  'background',
  'fill',
  'stroke',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'z-index',
  'box-shadow',
  'border-radius',
  'opacity',
  '/^(margin|padding)-(inline|block)/',
  'gap',
  'row-gap',
  'column-gap',
  '/^(min-|max-)?(inline|block)-size$/',
  '/^(min-|max-)?(width|height)$/',
  'transition-duration',
];

export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*$',
      { message: 'CSS module class names are camelCase (e.g. .fullWidth)' },
    ],
    'color-no-hex': [true, { message: 'Use a theme color variable, e.g. var(--colors-primary)' }],
    'color-named': ['never', { message: 'Use a theme color variable, e.g. var(--colors-primary)' }],
    'unit-disallowed-list': [['px'], { message: 'Use rem, %, vw/vh/dvh or a theme variable, never px' }],
    'property-disallowed-list': [
      physicalSides,
      { message: 'Use logical properties (inline-start / inline-end) so the layout mirrors in Arabic' },
    ],
    'declaration-property-value-disallowed-list': [
      { 'text-align': ['left', 'right'], float: ['left', 'right'], clear: ['left', 'right'] },
      { message: 'Use start / end instead of left / right' },
    ],
    'scale-unlimited/declaration-strict-value': [
      themedProperties,
      {
        ignoreValues: [
          '0',
          'auto',
          'none',
          'inherit',
          'initial',
          'unset',
          'currentcolor',
          'transparent',
          '100%',
          'fit-content',
          'min-content',
          'max-content',
        ],
        disableFix: true,
        message: 'Use a theme variable (var(--...)) for "${property}"',
      },
    ],
  },
};
