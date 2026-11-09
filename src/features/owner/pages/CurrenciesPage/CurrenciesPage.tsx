import { useState } from 'react';
import { addRate, listRates, setReportingCurrency } from '@/shared/api';
import { AsyncContent, Button, Card, Grid, Notice, PageHeader, SelectField, Stack, Table, Text, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, today } from '@/shared/utils';
import { CurrencySelect } from '../../components';

// Exchange rates by date (added, never edited) and the reporting currency used when branches are combined.
export const CurrenciesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(listRates, [version]);
  const action = useAction();
  const [draft, setDraft] = useState({ currency: 'SAR', rate: '', date: today() });
  const [saved, setSaved] = useState(false);
  const t = text.owner.currencies;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {saved && <Notice tone="success">{text.common.saved}</Notice>}
      <AsyncContent state={state}>
        {(data) => (
          <Stack gap={vars.spacing[4]}>
            <Card title={t.reporting}>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {fillText(t.reportingHint, { base: data.baseCurrency })}
              </Text>
              <SelectField
                label={t.reportingCurrency}
                value={data.reportingCurrency}
                onChange={async (currency) => {
                  if (await action.run('reporting', () => setReportingCurrency(currency))) setSaved(true);
                }}
                options={[data.baseCurrency, ...data.current.map((row) => row.currency)].map((currency) => ({ value: currency, label: format.currency(currency) }))}
              />
            </Card>
            <Card title={t.addRate}>
              <Text variant="bodySm" color={vars.colors.textMuted}>
                {fillText(t.addRateHint, { base: data.baseCurrency })}
              </Text>
              <Grid minColumnWidth={vars.sizes.field.narrow}>
                <CurrencySelect value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency })} />
                <TextField label={fillText(t.rateLabel, { currency: draft.currency, base: data.baseCurrency })} type="number" min={0} step="0.0001" value={draft.rate} onChange={(rate) => setDraft({ ...draft, rate })} />
                <TextField label={t.fromDate} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
              </Grid>
              <Stack direction="row" justify="flex-end">
                <Button
                  disabled={!(Number(draft.rate) > 0) || draft.currency === data.baseCurrency || Boolean(action.busy)}
                  onClick={async () => {
                    if (await action.run('rate', () => addRate(draft.currency, Number(draft.rate), draft.date))) {
                      setDraft({ ...draft, rate: '' });
                      setSaved(true);
                    }
                  }}
                >
                  {t.addRate}
                </Button>
              </Stack>
            </Card>
            <Card title={t.current}>
              <Table
                label={t.current}
                columns={[
                  { key: 'currency', label: text.common.currency },
                  { key: 'rate', label: fillText(t.inBase, { base: data.baseCurrency }), align: 'end' },
                ]}
                rows={data.current.map((row) => ({ key: row.currency, cells: { currency: format.currency(row.currency), rate: row.rate === null ? text.common.notSet : format.number(row.rate) } }))}
              />
            </Card>
            <Card title={t.history}>
              <Table
                label={t.history}
                columns={[
                  { key: 'date', label: t.fromDate },
                  { key: 'currency', label: text.common.currency },
                  { key: 'rate', label: fillText(t.inBase, { base: data.baseCurrency }), align: 'end' },
                  { key: 'by', label: text.common.by },
                ]}
                rows={data.rates.map((rate) => ({ key: rate.id, cells: { date: format.date(rate.date), currency: rate.currency, rate: format.number(rate.rate), by: `${format.user(rate.byId)} · ${format.dateTime(rate.at)}` } }))}
              />
              <Text variant="caption" color={vars.colors.textMuted}>
                {t.historyNote}
              </Text>
            </Card>
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
