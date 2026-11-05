import { PageHeader, Stack, Tabs } from '@/shared/components';
import { useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { DiscountPolicies } from './DiscountPolicies';
import { ApprovalPolicies } from './ApprovalPolicies';
import { ReturnPolicies } from './ReturnPolicies';
import { PaymentPolicies } from './PaymentPolicies';
import { StockPolicies } from './StockPolicies';

type PolicyTab = 'discounts' | 'approvals' | 'returns' | 'payments' | 'stock';

// Every policy in one place; each can be changed at any time and reset to the defaults.
export const PoliciesPage = () => {
  const { text } = useLocale();
  const [tab, setTab] = useQueryState<PolicyTab>('tab', 'discounts');
  const t = text.owner.policies;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Tabs<PolicyTab> label={t.title} value={tab} onChange={setTab} tabs={(['discounts', 'approvals', 'returns', 'payments', 'stock'] as const).map((value) => ({ value, label: t.tabs[value] }))}>
        {tab === 'discounts' && <DiscountPolicies />}
        {tab === 'approvals' && <ApprovalPolicies />}
        {tab === 'returns' && <ReturnPolicies />}
        {tab === 'payments' && <PaymentPolicies />}
        {tab === 'stock' && <StockPolicies />}
      </Tabs>
    </Stack>
  );
};
