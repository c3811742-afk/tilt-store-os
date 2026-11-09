import { createBranch, newLocation, updateBranch, type BranchInput } from '@/shared/api';
import { Button, CheckboxGroup, Grid, Icon, IconButton, Notice, SelectField, Stack, Table, Text, TextField } from '@/shared/components';
import { branchKinds } from '@/shared/constants';
import { useErrorMessage, useForm, useFormat, useLocale, useReference } from '@/shared/hooks';
import type { LocationKind } from '@/shared/types';
import { vars } from '@/shared/theme';
import { CountrySelect, CurrencySelect } from '../../components';
import { validators } from '../../utils';

const locationKinds: LocationKind[] = ['floor', 'backRoom', 'storage'];

export interface BranchFormProps {
  branchId?: string;
  initial: BranchInput;
  onDone: (branchId: string) => void;
}

// A branch's details, its currency and payment methods, and its stock locations (shop floor, back room, storage).
export const BranchForm = ({ branchId, initial, onDone }: BranchFormProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const check = validators(text);
  const t = text.owner.branches;
  const form = useForm(initial, { name: check.required, city: check.required });
  const locations = form.values.locations;

  return (
    <Stack
      as="form"
      gap={vars.spacing[5]}
      onSubmit={form.submit(async (values) => {
        const branch = branchId ? await updateBranch(branchId, values) : await createBranch(values);
        onDone(branch.id);
      })}
    >
      {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
      <Grid>
        <TextField label={text.common.name} required {...form.field('name')} />
        {form.values.kind !== 'warehouse' && (
          <SelectField label={t.kind} hint={t.kindHints[form.values.kind]} value={form.values.kind} onChange={(kind) => form.setValue('kind', kind)} options={branchKinds.filter((kind) => kind !== 'warehouse').map((kind) => ({ value: kind, label: t.kinds[kind] }))} />
        )}
        <CountrySelect value={form.values.countryCode} onChange={(countryCode) => form.setValue('countryCode', countryCode)} />
        <TextField label={text.owner.fields.city} required {...form.field('city')} />
        <TextField label={text.owner.fields.address} {...form.field('address')} />
        <TextField label={text.owner.fields.phone} type="tel" {...form.field('phone')} />
        <CurrencySelect value={form.values.currency} onChange={(currency) => form.setValue('currency', currency)} hint={t.currencyHint} />
      </Grid>
      {form.values.kind !== 'warehouse' && (
        <CheckboxGroup
          label={t.paymentMethods}
          options={settings.paymentMethods.filter((method) => method.active).map((method) => ({ value: method.id, label: format.text(method.name) }))}
          value={form.values.paymentMethodIds}
          onChange={(paymentMethodIds) => form.setValue('paymentMethodIds', paymentMethodIds)}
        />
      )}
      {/* Stock locations: a section of the form (not a box inside it), one row per location, as an editable table. */}
      <Stack gap={vars.spacing[3]}>
        <Stack gap={vars.spacing[1]}>
          <Text as="h2" variant="h4">
            {t.locations}
          </Text>
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {t.locationsHint}
          </Text>
        </Stack>
        <Table
          label={t.locations}
          columns={[
            { key: 'kind', label: t.locationKind },
            { key: 'en', label: `${text.common.name} (${text.common.languages.en})` },
            { key: 'ar', label: `${text.common.name} (${text.common.languages.ar})` },
            { key: 'remove', label: <span aria-hidden />, align: 'end', width: vars.sizes.tapTarget },
          ]}
          rows={locations.map((location, index) => {
            const change = (patch: Partial<typeof location>) => form.setValue('locations', locations.map((current, position) => (position === index ? { ...current, ...patch } : current)));
            return {
              key: location.id,
              cells: {
                kind: <SelectField label={<span aria-label={t.locationKind} />} value={location.kind} onChange={(kind) => change({ kind })} options={locationKinds.map((kind) => ({ value: kind, label: t.locationKinds[kind] }))} />,
                en: <TextField label={<span aria-label={`${text.common.name} (${text.common.languages.en})`} />} value={location.name.en} onChange={(en) => change({ name: { ...location.name, en } })} />,
                ar: <TextField label={<span aria-label={`${text.common.name} (${text.common.languages.ar})`} />} value={location.name.ar} onChange={(ar) => change({ name: { ...location.name, ar } })} />,
                remove: <IconButton icon="trash" label={text.common.remove} disabled={locations.length <= 1} onClick={() => form.setValue('locations', locations.filter((_, position) => position !== index))} />,
              },
            };
          })}
        />
        <Stack direction="row">
          <Button variant="secondary" size="sm" onClick={() => form.setValue('locations', [...locations, newLocation('storage', { en: '', ar: '' })])}>
            <Icon name="plus" />
            {t.addLocation}
          </Button>
        </Stack>
      </Stack>
      <Stack direction="row" justify="flex-end">
        <Button type="submit" disabled={form.submitting}>
          {branchId ? text.common.saveChanges : form.values.kind === 'warehouse' ? t.addWarehouse : t.add}
        </Button>
      </Stack>
    </Stack>
  );
};
