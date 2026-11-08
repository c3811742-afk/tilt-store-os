import { useState } from 'react';
import { getItemStock, searchProducts, type CartItemInput } from '@/shared/api';
import { AsyncContent, IconButton, SearchBox, Stack, Text } from '@/shared/components';
import { useAsync, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, fillText } from '@/shared/utils';
import { QtyStepper } from '../../components/QtyStepper';
import styles from '../../components/counter.module.css';

// The new items of an exchange: another size, colour, item or brand. Only what is in stock here can be picked.
export const ExchangeItems = ({ items, onChange }: { items: CartItemInput[]; onChange: (items: CartItemInput[]) => void }) => {
  const { text } = useLocale();
  const { branch } = useBranchScope();
  const branchId = branch?.id ?? '';
  const t = text.cashier.returns;
  const [query, setQuery] = useState('');
  const [productId, setProductId] = useState('');
  const hits = useAsync(() => searchProducts(query), [query]);
  const stock = useAsync(() => (productId ? getItemStock(branchId, productId) : Promise.resolve(null)), [branchId, productId]);
  const [picked, setPicked] = useState<Record<string, { label: string; max: number }>>({}); // name and stock of each new item
  const hitList = hits.status === 'success' ? hits.data : [];

  return (
    <Stack gap={vars.spacing[3]}>
      <SearchBox
        label={t.searchNew}
        placeholder={t.searchNew}
        value={query}
        onChange={setQuery}
        width="100%"
        emptyText={fillText(text.shell.noProducts, { query })}
        items={hitList.map((hit) => ({ key: hit.productId, label: hit.name, detail: hit.detail, image: hit.photo, imageName: hit.name }))}
        onSelect={(selected) => {
          setQuery('');
          setProductId(selected.key);
        }}
      />
      <AsyncContent state={stock} loading={null} empty={null}>
        {(current) =>
          current && (
            <Stack gap={vars.spacing[2]}>
              <Text variant="h4" autoDirection>
                {current.name}
              </Text>
              <div className={styles.chips}>
                {current.variants.map((variant) => {
                  const here = variant.floor + variant.backRoom;
                  const inList = items.find((item) => item.variantId === variant.variantId)?.qty ?? 0;
                  return (
                    <button
                      key={variant.variantId}
                      type="button"
                      className={cx(styles.colorChip, inList > 0 && styles.selected, here - inList <= 0 && styles.out)}
                      disabled={here - inList <= 0}
                      onClick={() => {
                        setPicked((all) => ({ ...all, [variant.variantId]: { label: `${current.name} ${variant.size} ${variant.color}`, max: here } }));
                        onChange(inList ? items.map((item) => (item.variantId === variant.variantId ? { ...item, qty: item.qty + 1 } : item)) : [...items, { variantId: variant.variantId, qty: 1 }]);
                      }}
                    >
                      {variant.size} · {variant.color}
                    </button>
                  );
                })}
              </div>
            </Stack>
          )
        }
      </AsyncContent>
      {items.length > 0 && (
        <ul className={styles.lines}>
          {items.map((item) => (
            <li key={item.variantId} className={styles.row}>
              <Text as="span" variant="bodySm" autoDirection>
                {picked[item.variantId]?.label ?? item.variantId}
              </Text>
              <Stack direction="row" align="center" gap={vars.spacing[2]}>
                <QtyStepper value={item.qty} max={picked[item.variantId]?.max ?? item.qty} onChange={(qty) => onChange(items.map((current) => (current.variantId === item.variantId ? { ...current, qty } : current)))} />
                <IconButton icon="close" label={text.cashier.cart.remove} onClick={() => onChange(items.filter((current) => current.variantId !== item.variantId))} />
              </Stack>
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
};
