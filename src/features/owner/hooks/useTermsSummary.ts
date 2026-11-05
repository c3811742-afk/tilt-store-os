import type { DetailItem } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import type { BrandTerms } from '@/shared/types';
import { fillText } from '@/shared/utils';

// A brand's deal as label / value pairs, for detail lists and the history.
export const useTermsSummary = () => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.brands.terms;

  // "30% commission, EGP 4,000 monthly fee" or "Bought stock": the deal in a few words.
  const deal = (terms: BrandTerms) => {
    const parts = [terms.model === 'commission' ? fillText(t.commissionShort, { rate: format.percent(terms.commissionRate, 0) }) : t.models[terms.model]];
    if (terms.monthlyFee) parts.push(fillText(t.feeShort, { amount: format.money(terms.monthlyFee, terms.feeCurrency) }));
    return parts.join(text.common.listSeparator);
  };

  const items = (terms: BrandTerms): DetailItem[] => {
    const own = terms.model === 'own';
    return [
      { key: 'deal', label: t.deal, value: deal(terms) },
      ...(own
        ? []
        : [
            { key: 'payout', label: t.payoutFrequency, value: `${t.frequencies[terms.payoutFrequency]} · ${terms.payoutCurrency}` },
            { key: 'fee', label: t.monthlyFee, value: terms.monthlyFee ? `${format.money(terms.monthlyFee, terms.feeCurrency)} · ${terms.deductFeeFromPayout ? t.feeDeducted : t.feeCollected}` : text.common.none },
            { key: 'defects', label: t.defectPolicy, value: t.defectPolicies[terms.defectPolicy] },
          ]),
      {
        key: 'discounts',
        label: t.allowDiscounts,
        value: !terms.allowDiscounts
          ? t.noDiscounts
          : own
            ? text.common.yes
            : terms.discountFunding === 'shared'
              ? fillText(t.sharedSplit, { brand: format.percent(terms.brandSharePercent, 0), store: format.percent(100 - terms.brandSharePercent, 0) })
              : t.fundings[terms.discountFunding],
      },
      { key: 'margin', label: t.minMargin, value: terms.minMargin === null ? t.defaultMargin : format.percent(terms.minMargin) },
    ];
  };

  return { deal, items };
};
