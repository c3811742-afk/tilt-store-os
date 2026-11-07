import { useState } from 'react';
import type { CounterProduct, CounterVariant } from '@/shared/api';
import { Text } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { cx, fillText } from '@/shared/utils';
import { ProductPhoto } from './ProductPhoto';
import styles from './counter.module.css';

interface ProductCardProps {
  product: CounterProduct;
  currency: string;
  inCart: (variantId: string) => number;
  onAdd: (variant: CounterVariant) => void;
  onMissing: (variant: CounterVariant) => void; // a size that isn't in this branch
}

// One product on the counter: photo, name, brand, the sizes of the chosen colour, and the price.
export const ProductCard = ({ product, currency, inCart, onAdd, onMissing }: ProductCardProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const colors = [...new Set(product.variants.map((variant) => variant.color))];
  const [color, setColor] = useState(() => colors.find((current) => product.variants.some((variant) => variant.color === current && variant.available > 0)) ?? colors[0]);
  const sizes = product.variants.filter((variant) => variant.color === color);
  const shown = sizes.find((variant) => variant.price !== null) ?? sizes[0];
  const promoted = shown?.promotion;

  return (
    <article className={styles.product}>
      <ProductPhoto src={product.photo} name={product.name} />
      <div className={styles.productText}>
        <Text as="h3" variant="h4" autoDirection>
          {product.name}
        </Text>
        <Text variant="caption" color={vars.colors.textMuted}>
          {product.brandName}
        </Text>
      </div>
      {colors.length > 1 && (
        <div className={styles.chips} role="group" aria-label={text.cashier.sell.color}>
          {colors.map((current) => (
            <button key={current} type="button" className={cx(styles.colorChip, current === color && styles.selected)} aria-pressed={current === color} onClick={() => setColor(current)}>
              {current}
            </button>
          ))}
        </div>
      )}
      <div className={styles.chips}>
        {sizes.map((variant) => {
          const out = variant.available - inCart(variant.variantId) <= 0 || variant.price === null;
          return (
            <button
              key={variant.variantId}
              type="button"
              className={cx(styles.chip, inCart(variant.variantId) > 0 && styles.selected, out && styles.out)}
              title={variant.price === null ? text.cashier.sell.noPrice : fillText(text.cashier.sell.inStock, { count: variant.available })}
              onClick={() => (out ? onMissing(variant) : onAdd(variant))}
            >
              {variant.size}
            </button>
          );
        })}
      </div>
      <div className={styles.price}>
        {shown?.price === null || !shown ? (
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {text.cashier.sell.noPrice}
          </Text>
        ) : (
          <>
            <Text as="span" variant="h4">
              {format.money(shown.price - (promoted?.perUnit ?? 0), currency)}
            </Text>
            {(promoted || (shown.regularPrice !== null && shown.regularPrice > shown.price)) && (
              <Text as="span" variant="caption" color={vars.colors.textMuted}>
                <s>{format.money(promoted ? shown.price : (shown.regularPrice ?? shown.price), currency)}</s>
              </Text>
            )}
          </>
        )}
      </div>
    </article>
  );
};
