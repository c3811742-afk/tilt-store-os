// Joins class names, skipping falsy ones: cx(styles.button, fullWidth && styles.fullWidth)
export const cx = (...classNames: Array<string | false | null | undefined>) => classNames.filter(Boolean).join(' ');
