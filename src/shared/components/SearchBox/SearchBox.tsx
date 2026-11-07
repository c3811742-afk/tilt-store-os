import { useId, useState, type CSSProperties, type FormEvent } from 'react';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, withDefaults } from '@/shared/utils';
import controls from '../Field/controls.module.css';
import { Icon } from '../Icon';
import { Spinner } from '../Spinner';
import { Thumbnail } from '../Thumbnail';
import { searchBoxDefaults } from './SearchBox.defaults';
import type { SearchBoxItem, SearchBoxProps } from './SearchBox.types';
import styles from './SearchBox.module.css';

// A search field with its results in a list under it. Enter picks the first result (or calls onSubmit, e.g. for a
// barcode scanner, which types the code and presses Enter).
export const SearchBox = (props: SearchBoxProps) => {
  const p = withDefaults(searchBoxDefaults, props);
  const { text } = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const showList = open && p.value.trim() !== '';

  const choose = (item: SearchBoxItem) => {
    setOpen(false);
    p.onSelect?.(item);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (p.onSubmit) p.onSubmit(p.value);
    else if (p.items[0]) choose(p.items[0]);
  };

  return (
    <form role="search" className={styles.box} style={{ '--search-box-width': p.width } as CSSProperties} onSubmit={onSubmit}>
      <span className={styles.icon} aria-hidden>
        {p.loading ? <Spinner size={vars.sizes.icon.sm} /> : <Icon name="search" />}
      </span>
      <input
        id={id}
        className={cx(controls.control, styles.input)}
        type="search"
        value={p.value}
        placeholder={p.placeholder}
        aria-label={p.label ?? text.common.search}
        aria-controls={`${id}-list`}
        aria-expanded={showList}
        inputMode={p.inputMode}
        autoFocus={p.autoFocus}
        autoComplete="off"
        onChange={(event) => {
          setOpen(true);
          p.onChange?.(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      />
      {showList && (
        <ul id={`${id}-list`} className={cx(styles.list, p.listPosition === 'inline' && styles.inline)}>
          {p.items.map((item) => (
            <li key={item.key}>
              {/* Keeps the field focused on mouse down, so the list stays open until the click */}
              <button type="button" className={styles.item} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>
                {(item.image !== undefined || item.imageName) && <Thumbnail src={item.image} name={item.imageName} />}
                <span className={styles.text}>
                  <span className={styles.label}>{item.label}</span>
                  {item.detail && <span className={styles.detail}>{item.detail}</span>}
                </span>
              </button>
            </li>
          ))}
          {!p.items.length && !p.loading && p.emptyText && <li className={styles.empty}>{p.emptyText}</li>}
        </ul>
      )}
    </form>
  );
};
