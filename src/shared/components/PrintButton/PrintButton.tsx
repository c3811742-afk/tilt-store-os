import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { printButtonDefaults } from './PrintButton.defaults';
import type { PrintButtonProps } from './PrintButton.types';
import styles from './PrintButton.module.css';

// Prints the current page (the app frame is left out by its print styles). The button itself is not printed.
export const PrintButton = (props: PrintButtonProps) => {
  const { label, variant } = withDefaults(printButtonDefaults, props);
  const { text } = useLocale();
  return (
    <span className={styles.printButton}>
      <Button variant={variant} onClick={() => window.print()}>
        {label ?? text.staff.print.print}
      </Button>
    </span>
  );
};
