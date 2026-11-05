import { useFormat, useLocale } from '@/shared/hooks';
import type { Promotion, PromoCode } from '@/shared/types';
import { fillText } from '@/shared/utils';

// "20% off, brand pays 50%": the discount of a promotion or code in one line.
export const usePromotionText = () => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.promotions;
  return (item: Pick<Promotion, 'discountType' | 'value' | 'currency' | 'brandSharePercent'> | PromoCode) => {
    const amount = item.discountType === 'percent' ? format.percent(item.value, 0) : format.money(item.value, item.currency ?? '');
    return `${fillText(t.off, { amount })} · ${fillText(t.brandPays, { share: format.percent(item.brandSharePercent, 0) })}`;
  };
};
