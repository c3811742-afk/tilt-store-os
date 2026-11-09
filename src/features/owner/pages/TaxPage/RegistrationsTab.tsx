import { useState } from 'react';
import { addVatRate, getTaxSetup, saveTaxRegistration } from '@/shared/api';
import { AsyncContent, Button, Card, Grid, Notice, SelectField, Stack, Table, Text, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { TaxAuthority, TaxRegistration } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, today } from '@/shared/utils';

const authorities: TaxAuthority[] = ['eta', 'zatca', 'none'];

// The store's tax registration in each country, and its VAT rates by start date.
export const RegistrationsTab = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(getTaxSetup, [version]);
  const action = useAction();
  const [drafts, setDrafts] = useState<Record<string, TaxRegistration & { authority: TaxAuthority }>>({});
  const [vat, setVat] = useState<Record<string, { rate: string; startDate: string }>>({});
  const [saved, setSaved] = useState(false);
  const t = text.owner.tax;

  return (
    <AsyncContent state={state}>
      {(data) => (
        <Stack gap={vars.spacing[4]}>
          {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
          {saved && <Notice tone="success">{text.common.saved}</Notice>}
          {data.countries.map((country) => {
            const draft = drafts[country.countryCode] ?? { ...country.registration, authority: country.authority };
            const setDraft = (patch: Partial<typeof draft>) => setDrafts((current) => ({ ...current, [country.countryCode]: { ...draft, ...patch } }));
            const vatDraft = vat[country.countryCode] ?? { rate: '', startDate: today() };
            const missing = !country.registration.vatNumber;
            return (
              <Card key={country.countryCode} title={format.country(country.countryCode)} actions={<Text as="span" variant="bodySm">{fillText(t.vatToday, { rate: format.percent(country.vatToday) })}</Text>}>
                {missing && <Notice tone="warning">{t.missingRegistration}</Notice>}
                <Grid>
                  <TextField label={t.legalName} value={draft.legalName} onChange={(legalName) => setDraft({ legalName })} />
                  <TextField label={t.vatNumber} value={draft.vatNumber} onChange={(vatNumber) => setDraft({ vatNumber })} />
                  <TextField label={t.commercialRegistration} value={draft.commercialRegistration} onChange={(commercialRegistration) => setDraft({ commercialRegistration })} />
                  <TextField label={text.owner.fields.address} value={draft.address} onChange={(address) => setDraft({ address })} />
                  <SelectField label={t.authority} hint={t.authorityHint} value={draft.authority} onChange={(authority) => setDraft({ authority })} options={authorities.map((value) => ({ value, label: t.authorities[value] }))} />
                </Grid>
                <Stack direction="row" justify="flex-end">
                  <Button
                    disabled={Boolean(action.busy) || !drafts[country.countryCode]}
                    onClick={async () => {
                      const { authority, ...registration } = draft;
                      if (await action.run(`reg-${country.countryCode}`, () => saveTaxRegistration(registration, authority))) setSaved(true);
                    }}
                  >
                    {text.common.saveChanges}
                  </Button>
                </Stack>
                <Text as="h3" variant="h4">
                  {t.vatRates}
                </Text>
                <Stack direction="row" wrap align="flex-end" gap={vars.spacing[3]}>
                  <TextField label={t.newRate} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={vatDraft.rate} onChange={(rate) => setVat((current) => ({ ...current, [country.countryCode]: { ...vatDraft, rate } }))} width={vars.sizes.field.narrow} />
                  <TextField label={t.startsOn} type="date" value={vatDraft.startDate} onChange={(startDate) => setVat((current) => ({ ...current, [country.countryCode]: { ...vatDraft, startDate } }))} width={vars.sizes.field.narrow} />
                  <Button
                    variant="secondary"
                    disabled={vatDraft.rate.trim() === '' || Number(vatDraft.rate) < 0 || Boolean(action.busy)}
                    onClick={async () => {
                      if (await action.run(`vat-${country.countryCode}`, () => addVatRate(country.countryCode, Number(vatDraft.rate), vatDraft.startDate))) {
                        setVat((current) => ({ ...current, [country.countryCode]: { rate: '', startDate: today() } }));
                        setSaved(true);
                      }
                    }}
                  >
                    {t.addRate}
                  </Button>
                </Stack>
                <Table
                  label={t.vatRates}
                  columns={[
                    { key: 'start', label: t.startsOn },
                    { key: 'rate', label: t.rate, align: 'end' },
                    { key: 'by', label: text.common.by },
                  ]}
                  rows={country.vatRates.map((rate) => ({ key: rate.id, cells: { start: format.date(rate.startDate), rate: format.percent(rate.rate), by: format.user(rate.byId) } }))}
                />
              </Card>
            );
          })}
        </Stack>
      )}
    </AsyncContent>
  );
};
