import { useState } from 'react';
import { countLineKey, saveCount, submitCount, type VariantHit } from '@/shared/api';
import { useErrorMessage, useFormat, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Notice } from '../Notice';
import { SelectField } from '../SelectField';
import { Stack } from '../Stack';
import { Table } from '../Table';
import { Text } from '../Text';
import { QtyInput } from '../QtyInput';
import { VariantSearch } from '../VariantSearch';
import type { CountSheetLine, CountSheetProps } from './CountSheet.types';

// Counting an open stock count: scan each piece (or type the quantity), then save or submit it with a reason for
// every difference. In a blind count the expected quantities stay hidden until the manager reviews it.
export const CountSheet = ({ view, onSubmitted }: CountSheetProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branches, settings } = useReference();
  const errorMessage = useErrorMessage();
  const { count } = view;
  const t = text.staff.counts;
  const locations = branches.find((branch) => branch.id === count.branchId)?.locations ?? [];
  const [locationId, setLocationId] = useState(count.scope?.locationId ?? locations[0]?.id ?? '');
  const [lines, setLines] = useState<CountSheetLine[]>(() => view.lines.map((line) => ({ ...line })));
  const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const reasons = settings.lists.countReasons.filter((option) => !option.archived);
  const locationName = (id: string) => format.text(locations.find((location) => location.id === id)?.name);

  const scanned = (hit: VariantHit) => {
    const key = countLineKey(hit.variantId, locationId);
    const existing = lines.find((line) => countLineKey(line.variantId, line.locationId) === key);
    if (existing) {
      setLines(lines.map((line) => (line === existing ? { ...line, counted: line.counted + 1 } : line)));
      setNotice(null);
      return;
    }
    setLines([...lines, { ...hit, locationId, expected: null, counted: 1, difference: null }]);
    setNotice({ tone: 'info', text: t.scannedNotInList });
  };
  const update = (line: CountSheetLine, change: Partial<CountSheetLine>) => setLines(lines.map((current) => (current === line ? { ...current, ...change } : current)));
  const payload = () => lines.map(({ variantId, locationId: place, counted, reasonId }) => ({ variantId, locationId: place, counted, reasonId }));

  const run = async (submit: boolean) => {
    setBusy(true);
    setError(null);
    const result = await safeAsync(() => (submit ? submitCount(count.id, payload()) : saveCount(count.id, payload())));
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (submit) onSubmitted?.();
    else setNotice({ tone: 'success', text: t.saved });
  };

  return (
    <Stack gap={vars.spacing[4]}>
      <Card>
        <Stack gap={vars.spacing[3]}>
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {t.scanHint}
          </Text>
          <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-start">
            {!count.scope?.locationId && (
              <SelectField label={t.location} value={locationId} onChange={setLocationId} options={locations.map((location) => ({ value: location.id, label: format.text(location.name) }))} width={vars.sizes.field.narrow} />
            )}
            <VariantSearch onPick={scanned} disabled={busy} autoFocus />
          </Stack>
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        </Stack>
      </Card>
      {Boolean(error) && <Notice tone="danger">{errorMessage(error)}</Notice>}
      <Table
        label={count.number}
        stackOnMobile
        columns={[
          { key: 'item', label: text.staff.items.item },
          { key: 'location', label: t.location },
          { key: 'expected', label: t.expected, align: 'end' },
          { key: 'counted', label: t.counted, align: 'end', width: vars.sizes.field.qty },
          { key: 'difference', label: t.difference, align: 'end' },
          { key: 'reason', label: t.reasonFor },
        ]}
        rows={lines.map((line) => {
          const difference = line.expected === null ? null : line.counted - line.expected;
          return {
            key: countLineKey(line.variantId, line.locationId),
            cells: {
              item: (
                <Stack gap={vars.spacing[0]}>
                  <Text as="span" variant="bodySm" autoDirection>
                    {line.productName}
                  </Text>
                  <Text as="span" variant="caption" color={vars.colors.textMuted}>
                    {[line.size, line.color, line.sku].filter(Boolean).join(' · ')}
                  </Text>
                </Stack>
              ),
              location: locationName(line.locationId),
              expected: line.expected === null ? (count.blind ? t.hidden : '') : format.number(line.expected),
              counted: (
                <QtyInput label={t.counted} value={String(line.counted)} onChange={(value) => update(line, { counted: Math.max(0, Math.floor(Number(value) || 0)) })} disabled={busy} />
              ),
              difference: difference === null || difference === 0 ? '' : <Badge variant="warning">{format.number(difference)}</Badge>,
              reason:
                !count.blind && difference !== 0 ? (
                  <SelectField
                    label={<span aria-hidden />}
                    placeholder={text.staff.decision.chooseReason}
                    value={line.reasonId ?? ''}
                    onChange={(reasonId) => update(line, { reasonId })}
                    options={reasons.map((option) => ({ value: option.id, label: format.option(option.id) }))}
                    disabled={busy}
                  />
                ) : (
                  ''
                ),
            },
          };
        })}
      />
      <Text variant="caption" color={vars.colors.textMuted}>
        {fillText(text.staff.items.lineCount, { lines: format.number(lines.length), pieces: format.number(lines.reduce((sum, line) => sum + line.counted, 0)) })}
      </Text>
      <Text variant="bodySm" color={vars.colors.textMuted}>
        {t.submitHint}
      </Text>
      <Stack direction="row" justify="flex-end" gap={vars.spacing[2]} wrap>
        <Button variant="secondary" disabled={busy} onClick={() => void run(false)}>
          {t.save}
        </Button>
        <Button disabled={busy} onClick={() => void run(true)}>
          {t.submit}
        </Button>
      </Stack>
    </Stack>
  );
};
