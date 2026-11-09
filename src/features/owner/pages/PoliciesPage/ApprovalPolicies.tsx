import { Checkbox, Grid, Stack, TextField } from '@/shared/components';
import { useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { ConfigListEditor, SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const toNumber = (value: string) => (value.trim() === '' ? 0 : Number(value));
const ruleKeys = ['discountAboveLimit', 'returnOutsidePolicy', 'returnWithoutReceipt', 'void', 'priceOverride'] as const;

// Which cashier actions need a manager, the amounts above which a manager or an owner must approve, and approval PIN tries.
export const ApprovalPolicies = () => {
  const { text } = useLocale();
  const { settings } = useReference();
  const t = text.owner.policies;
  const draft = useSettingsDraft(['approvalRules', 'refundApprovalAbove', 'ownerApprovalAbove', 'stockCountApprovalAbove', 'approvalPinTries']);
  const { values, set } = draft;
  return (
    <Stack gap={vars.spacing[4]}>
      <SettingsSection title={t.approvalRules} hint={t.approvalRulesHint} draft={draft}>
        <Stack gap={vars.spacing[2]}>
          {ruleKeys.map((key) => (
            <Checkbox key={key} label={t.rules[key]} checked={values.approvalRules[key]} onChange={(checked) => set('approvalRules', { ...values.approvalRules, [key]: checked })} />
          ))}
        </Stack>
        <Grid minColumnWidth={vars.sizes.field.narrow}>
          <TextField label={t.refundAbove} hint={t.refundAboveHint} type="number" min={0} prefix={settings.baseCurrency} value={String(values.refundApprovalAbove)} onChange={(value) => set('refundApprovalAbove', toNumber(value))} />
          <TextField label={t.ownerAbove} hint={t.ownerAboveHint} type="number" min={0} prefix={settings.baseCurrency} value={String(values.ownerApprovalAbove)} onChange={(value) => set('ownerApprovalAbove', toNumber(value))} />
          <TextField label={t.countAbove} hint={t.countAboveHint} type="number" min={0} value={String(values.stockCountApprovalAbove)} onChange={(value) => set('stockCountApprovalAbove', toNumber(value))} />
          <TextField label={t.pinTries} type="number" min={1} value={String(values.approvalPinTries)} onChange={(value) => set('approvalPinTries', Math.max(toNumber(value), 1))} />
        </Grid>
      </SettingsSection>
      <ConfigListEditor listKey="approvalReasons" title={t.approvalReasons} hint={t.approvalReasonsHint} />
      <ConfigListEditor listKey="rejectionReasons" title={t.rejectionReasons} hint={t.rejectionReasonsHint} />
      <ConfigListEditor listKey="voidReasons" title={t.voidReasons} hint={t.voidReasonsHint} />
    </Stack>
  );
};
