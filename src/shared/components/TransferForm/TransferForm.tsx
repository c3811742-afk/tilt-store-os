import { useState } from 'react';
import { createTransfer } from '@/shared/api';
import { useBranchScope, useErrorMessage, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Card } from '../Card';
import { ItemLinesEditor, type ItemLine } from '../ItemLinesEditor';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextAreaField } from '../TextAreaField';
import { transferFormDefaults } from './TransferForm.defaults';
import type { TransferFormProps } from './TransferForm.types';

// A new transfer for the branch the person works in: asking another branch or the warehouse for items, or
// sending items from this branch to another one (a dispatch). The items are scanned or searched.
export const TransferForm = (props: TransferFormProps) => {
  const { mode, initialLines, initialOtherBranchId, onCreated, onCancel } = withDefaults(transferFormDefaults, props);
  const { text } = useLocale();
  const { branches } = useReference();
  const { branchId } = useBranchScope();
  const errorMessage = useErrorMessage();
  const [otherId, setOtherId] = useState(initialOtherBranchId);
  const [lines, setLines] = useState<ItemLine[]>(initialLines);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ branch?: string; lines?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const t = text.staff.transfers;
  const others = branches.filter((branch) => !branch.archived && branch.kind !== 'online' && branch.id !== branchId);

  const submit = async () => {
    const wanted = lines.filter((line) => line.qty > 0);
    const found = { branch: otherId ? undefined : t.chooseBranch, lines: wanted.length ? undefined : t.addItems };
    setErrors(found);
    if (found.branch || found.lines) return;
    setBusy(true);
    setError(null);
    const result = await safeAsync(() =>
      createTransfer({
        fromBranchId: mode === 'request' ? otherId : branchId,
        toBranchId: mode === 'request' ? branchId : otherId,
        lines: wanted.map(({ variantId, qty }) => ({ variantId, qty })),
        note: note.trim() || undefined,
      }),
    );
    setBusy(false);
    if (!result.ok) return setError(result.error);
    onCreated?.(result.data);
  };

  return (
    <Card>
      <Stack
        as="form"
        gap={vars.spacing[4]}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {mode === 'request' ? t.requestHint : t.sendHint}
        </Text>
        {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
        <SelectField
          label={mode === 'request' ? t.fromBranch : t.toBranch}
          required
          placeholder={t.chooseBranch}
          value={otherId}
          onChange={setOtherId}
          error={errors.branch}
          width={vars.sizes.field.maxWidth}
          options={others.map((branch) => ({ value: branch.id, label: branch.name }))}
        />
        <ItemLinesEditor lines={lines} onChange={setLines} error={errors.lines} disabled={busy} />
        <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
        <Stack direction="row" justify="flex-end" gap={vars.spacing[2]}>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {text.common.cancel}
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {mode === 'request' ? t.submitRequest : t.submitSend}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
};
