import { useState } from 'react';
import { startCount, type CountScope } from '@/shared/api';
import { useBranchScope, useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Modal } from '../Modal';
import { Notice } from '../Notice';
import { BrandSelect } from '../ReferenceSelect';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { startCountModalDefaults } from './StartCountModal.defaults';
import type { StartCountModalProps } from './StartCountModal.types';

// Starts a stock count in the branch: everything, one brand or one location, and optionally blind.
export const StartCountModal = (props: StartCountModalProps) => {
  const { open, allowBlind, onClose, onStarted } = withDefaults(startCountModalDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { branches } = useReference();
  const { branchId } = useBranchScope();
  const errorMessage = useErrorMessage();
  const [kind, setKind] = useState<CountScope['kind']>('full');
  const [brandId, setBrandId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [blind, setBlind] = useState(false);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.counts;
  const locations = branches.find((branch) => branch.id === branchId)?.locations ?? [];

  const submit = async () => {
    const scope: CountScope = { kind, brandId: kind === 'brand' ? brandId : undefined, locationId: kind === 'location' ? locationId : undefined };
    if ((kind === 'brand' && !brandId) || (kind === 'location' && !locationId)) return setMissing(true);
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => startCount({ branchId, scope, blind: allowBlind && blind }));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onStarted?.(result.data);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.startTitle}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {t.start}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SelectField<CountScope['kind']>
          label={t.scope}
          value={kind}
          onChange={(value) => {
            setKind(value);
            setMissing(false);
          }}
          options={(['full', 'brand', 'location'] as const).map((value) => ({ value, label: t.scopes[value] }))}
        />
        {kind === 'brand' && <BrandSelect label={t.brand} allLabel={t.chooseScope} value={brandId} onChange={setBrandId} error={missing ? t.chooseScope : undefined} />}
        {kind === 'location' && (
          <SelectField
            label={t.location}
            placeholder={t.chooseScope}
            value={locationId}
            onChange={setLocationId}
            error={missing ? t.chooseScope : undefined}
            options={locations.map((location) => ({ value: location.id, label: format.text(location.name) }))}
          />
        )}
        {allowBlind && <Checkbox label={t.blind} hint={t.blindHint} checked={blind} onChange={setBlind} />}
      </Stack>
    </Modal>
  );
};
