import { useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { TextField } from '../TextField';
import { defectReasonsDefaults } from './DefectReasons.defaults';
import type { DefectReasonsProps } from './DefectReasons.types';
import { splitDefectReasons } from './DefectReasons.utils';
import styles from './DefectReasons.module.css';

// Why pieces are defective. One reason covers them all; "Add another reason" splits them, each reason with its own
// quantity, and the quantities can never add up to more than the defective pieces.
export const DefectReasons = (props: DefectReasonsProps) => {
  const p = withDefaults(defectReasonsDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const t = text.staff.defects;
  const rows = splitDefectReasons(p.value, p.total);
  const split = rows.length > 1;
  const assigned = rows.reduce((sum, row) => sum + row.qty, 0);
  const reasons = settings.lists.defectReasons.filter((option) => !option.archived);

  const update = (index: number, change: Partial<(typeof rows)[number]>) => p.onChange?.(rows.map((row, current) => (current === index ? { ...row, ...change } : row)));
  const setQty = (index: number, raw: string) => {
    const others = assigned - rows[index].qty;
    update(index, { qty: Math.min(Math.max(0, Math.floor(Number(raw) || 0)), Math.max(p.total - others, 0)) });
  };
  // A new reason takes the pieces still without one, or one piece from the biggest group.
  const add = () => {
    const next = rows.map((row) => ({ ...row }));
    let qty = p.total - assigned;
    if (qty <= 0) {
      const biggest = next.reduce((most, row) => (row.qty > most.qty ? row : most), next[0]);
      biggest.qty -= 1;
      qty = 1;
    }
    p.onChange?.([...next, { reasonId: '', qty }]);
  };
  // A removed reason's pieces go back to the first one.
  const remove = (index: number) => {
    const next = rows.filter((_row, current) => current !== index);
    next[0] = { ...next[0], qty: next[0].qty + rows[index].qty };
    p.onChange?.(next);
  };

  return (
    <Stack gap={vars.spacing[2]}>
      {rows.map((row, index) => (
        <div key={index} className={styles.row}>
          <div className={styles.reason}>
            <SelectField
              label={index === 0 ? (p.label ?? t.defectType) : undefined}
              required={p.required}
              placeholder={text.staff.decision.chooseReason}
              value={row.reasonId}
              onChange={(reasonId) => update(index, { reasonId })}
              disabled={p.disabled}
              options={reasons.map((option) => ({ value: option.id, label: format.option(option.id), disabled: rows.some((other, current) => current !== index && other.reasonId === option.id) }))}
            />
          </div>
          {split && (
            <>
              <TextField
                label={index === 0 ? text.common.quantity : undefined}
                type="number"
                inputMode="numeric"
                min={1}
                value={row.qty ? String(row.qty) : ''}
                onChange={(raw) => setQty(index, raw)}
                width={vars.sizes.field.qty}
                disabled={p.disabled}
              />
              <IconButton icon="trash" label={text.common.remove} onClick={() => remove(index)} disabled={p.disabled} />
            </>
          )}
        </div>
      ))}
      <div className={styles.footer}>
        {p.total > rows.length && (
          <Button size="sm" variant="secondary" onClick={add} disabled={p.disabled}>
            {t.addReason}
          </Button>
        )}
        {split && (
          <Text as="span" variant="caption" color={assigned === p.total ? vars.colors.textMuted : vars.colors.danger}>
            {fillText(t.reasonsAssigned, { done: format.number(assigned), total: format.number(p.total) })}
          </Text>
        )}
      </div>
      {p.error && (
        <Text variant="caption" color={vars.colors.danger}>
          {p.error}
        </Text>
      )}
    </Stack>
  );
};
