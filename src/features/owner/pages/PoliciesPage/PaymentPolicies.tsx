import { useState } from 'react';
import { updateBranch } from '@/shared/api';
import { Badge, Button, Checkbox, Grid, Icon, IconButton, LocalizedField, Notice, SelectField, Stack, Table, TextField } from '@/shared/components';
import { useAction, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import type { PaymentKind, PaymentMethod } from '@/shared/types';
import { vars } from '@/shared/theme';
import { SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';

const kinds: PaymentKind[] = ['cash', 'card', 'wallet', 'instapay', 'storeCredit', 'cod', 'other'];

// Payment methods (add one, turn one off, its fee) and which branch accepts which.
export const PaymentPolicies = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { branches } = useReference();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const t = text.owner.policies;
  const draft = useSettingsDraft(['paymentMethods']);
  const methods = draft.values.paymentMethods;
  const [adding, setAdding] = useState<PaymentMethod | null>(null);
  const update = (id: string, patch: Partial<PaymentMethod>) => draft.set('paymentMethods', methods.map((method) => (method.id === id ? { ...method, ...patch } : method)));
  const selling = branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse');

  return (
    <Stack gap={vars.spacing[4]}>
      <SettingsSection title={t.paymentMethods} hint={t.paymentMethodsHint} draft={draft}>
        <Table
          label={t.paymentMethods}
          columns={[
            { key: 'name', label: text.common.name },
            { key: 'kind', label: t.methodKind },
            { key: 'fee', label: t.fee, align: 'end' },
            { key: 'active', label: text.common.status },
          ]}
          rows={methods.map((method) => ({
            key: method.id,
            cells: {
              name: format.text(method.name),
              kind: t.methodKinds[method.kind],
              fee: <TextField label="" type="number" min={0} step="0.05" prefix="%" value={String(method.feePercent)} onChange={(value) => update(method.id, { feePercent: Number(value) || 0 })} width={vars.sizes.field.narrow} />,
              active: <Checkbox label={method.active ? t.on : t.off} checked={method.active} onChange={(active) => update(method.id, { active })} />,
            },
          }))}
        />
        {adding ? (
          <Stack gap={vars.spacing[3]}>
            <LocalizedField label={text.common.name} value={adding.name} onChange={(name) => setAdding({ ...adding, name })} required />
            <Grid minColumnWidth={vars.sizes.field.narrow}>
              <SelectField label={t.methodKind} value={adding.kind} onChange={(kind) => setAdding({ ...adding, kind })} options={kinds.map((value) => ({ value, label: t.methodKinds[value] }))} />
              <TextField label={t.fee} type="number" min={0} prefix="%" value={String(adding.feePercent)} onChange={(value) => setAdding({ ...adding, feePercent: Number(value) || 0 })} />
            </Grid>
            <Stack direction="row" gap={vars.spacing[2]}>
              <Button
                size="sm"
                disabled={!adding.name.en.trim() && !adding.name.ar.trim()}
                onClick={() => {
                  draft.set('paymentMethods', [...methods, adding]);
                  setAdding(null);
                }}
              >
                {text.common.add}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAdding(null)}>
                {text.common.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row">
            <Button variant="secondary" size="sm" onClick={() => setAdding({ id: crypto.randomUUID(), name: { en: '', ar: '' }, kind: 'other', feePercent: 0, active: true })}>
              <Icon name="plus" />
              {t.addMethod}
            </Button>
          </Stack>
        )}
      </SettingsSection>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Table
        label={t.acceptedBy}
        columns={[{ key: 'method', label: t.acceptedBy }, ...selling.map((branch) => ({ key: branch.id, label: branch.name, align: 'center' as const }))]}
        rows={methods
          .filter((method) => method.active)
          .map((method) => ({
            key: method.id,
            cells: {
              method: format.text(method.name),
              ...Object.fromEntries(
                selling.map((branch) => {
                  const accepted = branch.paymentMethodIds.includes(method.id);
                  return [
                    branch.id,
                    <IconButton
                      key={branch.id}
                      icon={accepted ? 'check' : 'close'}
                      label={`${branch.name}: ${accepted ? t.on : t.off}`}
                      color={accepted ? vars.colors.success : vars.colors.textMuted}
                      disabled={Boolean(action.busy)}
                      onClick={() => {
                        const { id, archived: _archived, createdAt: _created, ...input } = branch;
                        void action.run(id, () => updateBranch(id, { ...input, paymentMethodIds: accepted ? branch.paymentMethodIds.filter((current) => current !== method.id) : [...branch.paymentMethodIds, method.id] }));
                      }}
                    />,
                  ];
                }),
              ),
            },
          }))}
      />
      {methods.some((method) => !method.active) && <Badge>{t.offHidden}</Badge>}
    </Stack>
  );
};
