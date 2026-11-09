import { withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { accordionDefaults } from './Accordion.defaults';
import type { AccordionProps } from './Accordion.types';
import styles from './Accordion.module.css';

// A list of headings that open to show more (questions and answers, for example). Built on <details>, so it works
// with the keyboard and screen readers without extra code; several can be open at once.
export const Accordion = (props: AccordionProps) => {
  const { items, emptyText } = withDefaults(accordionDefaults, props);
  if (!items.length) return emptyText ? <Text variant="bodySm">{emptyText}</Text> : null;
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <details key={item.key} className={styles.item}>
          <summary className={styles.summary}>
            <span>{item.title}</span>
            <span className={styles.chevron}>
              <Icon name="chevronDown" />
            </span>
          </summary>
          <div className={styles.content}>{item.content}</div>
        </details>
      ))}
    </div>
  );
};
