import { useId, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { cx, formatNumber, withDefaults } from '@/shared/utils';
import { useLocale } from '@/shared/hooks';
import { tabsDefaults } from './Tabs.defaults';
import type { Tab, TabsProps } from './Tabs.types';
import styles from './Tabs.module.css';

// Tabs that switch what is shown in one place. Arrow keys move between tabs, following the reading direction.
export const Tabs = <T extends string>(props: TabsProps<T>) => {
  const resolved = withDefaults(tabsDefaults, props);
  const { label, onChange, children, panelGap } = resolved;
  const tabs = resolved.tabs as Tab<T>[];
  const { locale } = useLocale();
  const [ownValue, setOwnValue] = useState<T | undefined>(undefined);
  const value = resolved.value ?? ownValue ?? tabs[0]?.value;
  const baseId = useId();

  const select = (next: T) => {
    setOwnValue(next);
    onChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key !== forward && event.key !== backward) return;
    event.preventDefault();
    select(tabs[(index + (event.key === forward ? 1 : -1) + tabs.length) % tabs.length].value);
  };

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              className={cx(styles.tab, selected && styles.selected)}
              onClick={() => select(tab.value)}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && <span className={styles.count}>{formatNumber(tab.count, locale)}</span>}
            </button>
          );
        })}
      </div>
      {children && (
        <div id={`${baseId}-panel`} role="tabpanel" className={styles.panel} style={{ '--tabs-panel-gap': panelGap } as CSSProperties}>
          {children}
        </div>
      )}
    </div>
  );
};
