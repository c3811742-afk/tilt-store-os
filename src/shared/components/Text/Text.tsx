import type { CSSProperties } from 'react';
import { withDefaults } from '@/shared/utils';
import { textDefaults, textStyleVars } from './Text.defaults';
import type { TextProps } from './Text.types';
import styles from './Text.module.css';

export const Text = (props: TextProps) => {
  const { children, as: Element, variant, color, align, autoDirection } = withDefaults(textDefaults, props);
  const textStyle = textStyleVars[variant];

  const style = {
    '--text-font-family': textStyle.fontFamily,
    '--text-font-size': textStyle.fontSize,
    '--text-font-weight': textStyle.fontWeight,
    '--text-line-height': textStyle.lineHeight,
    '--text-letter-spacing': textStyle.letterSpacing,
    '--text-transform': textStyle.textTransform,
    '--text-color': color,
    '--text-align': align,
  } as CSSProperties;

  return (
    <Element className={styles.text} style={style} dir={autoDirection ? 'auto' : undefined}>
      {children}
    </Element>
  );
};
