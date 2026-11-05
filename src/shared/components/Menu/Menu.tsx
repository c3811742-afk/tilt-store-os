import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { cx, withDefaults } from '@/shared/utils';
import { Icon } from '../Icon';
import { menuDefaults } from './Menu.defaults';
import type { MenuItem, MenuProps } from './Menu.types';
import styles from './Menu.module.css';

// A dropdown list of actions or choices under a button. Closes on outside click, Esc or a choice.
export const Menu = (props: MenuProps) => {
  const { trigger, items, header, align, minWidth } = withDefaults(menuDefaults, props);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemClass = (item: MenuItem) => cx(styles.item, item.danger && styles.danger, item.selected && styles.selected);
  const body = (item: MenuItem) => (
    <>
      {item.icon && <Icon name={item.icon} />}
      {item.label}
      {item.selected && <Icon name="check" />}
    </>
  );

  return (
    <div className={styles.menu} ref={ref}>
      {trigger({ open, toggle: () => setOpen((current) => !current) })}
      {open && (
        <div className={cx(styles.panel, align === 'end' ? styles.end : styles.start)} style={{ '--menu-min-width': minWidth } as CSSProperties} role="menu">
          {header && <div className={styles.header}>{header}</div>}
          {items.map((item) =>
            item.to ? (
              <Link key={item.key} to={item.to} role="menuitem" className={itemClass(item)} onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {body(item)}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={itemClass(item)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {body(item)}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};
