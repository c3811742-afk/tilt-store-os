import { useState } from 'react';
import { requestNewStock } from '@/shared/api';
import { Button, ItemLinesEditor, Modal, Notice, Stack, Text, TextAreaField, type ItemLine } from '@/shared/components';
import { useAction, useBranchScope, useErrorMessage, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

interface RequestStockModalProps {
  open: boolean;
  onClose: () => void;
  initialLines?: ItemLine[]; // e.g. a low-stock item, with a suggested quantity
  onSent?: (message: string) => void;
}

// Asks the owner for new stock for the branch: the items, how many, and a note.
export const RequestStockModal = ({ open, onClose, initialLines = [], onSent }: RequestStockModalProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const action = useAction();
  const [lines, setLines] = useState<ItemLine[]>(initialLines);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const t = text.manager.stock;

  const submit = async () => {
    const wanted = lines.filter((line) => line.qty > 0);
    if (!wanted.length) return setError(t.addItems);
    setError('');
    const request = await action.run('send', () => requestNewStock({ branchId, lines: wanted.map(({ variantId, qty }) => ({ variantId, qty })), note: note.trim() || undefined }));
    if (!request) return;
    onSent?.(fillText(t.requestSent, { number: request.number }));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.requestTitle}
      width={vars.sizes.modal.wide}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={Boolean(action.busy)}>
            {t.requestStock}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.requestHint}
        </Text>
        {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
        <ItemLinesEditor lines={lines} onChange={setLines} error={error} disabled={Boolean(action.busy)} autoFocus stockBranchId={branchId} />
        <TextAreaField label={text.common.note} hint={text.common.optional} value={note} onChange={setNote} />
      </Stack>
    </Modal>
  );
};
