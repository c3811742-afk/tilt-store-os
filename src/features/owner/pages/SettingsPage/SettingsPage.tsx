import { useState } from 'react';
import { resetDatabase } from '@/shared/api';
import { BrandLogo, Button, Card, FileField, Grid, LocalizedField, Notice, PageHeader, SegmentedControl, Stack, Text, TextField, Thumbnail } from '@/shared/components';
import { useAction, useFormat, useLocale } from '@/shared/hooks';
import type { CountrySettings, ReceiptLanguage } from '@/shared/types';
import { vars } from '@/shared/theme';
import { SettingsSection } from '../../components';
import { useSettingsDraft } from '../../hooks/useSettingsDraft';
import styles from './SettingsPage.module.css';

// Company name and logo, receipt text per country and receipt language, and resetting the demo.
export const SettingsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const t = text.owner.settings;
  const company = useSettingsDraft(['company', 'receiptLanguage']);
  const receipts = useSettingsDraft(['countries']);
  const action = useAction();
  const [confirmReset, setConfirmReset] = useState(false);
  const setReceipt = (code: string, patch: Partial<CountrySettings['receipt']>) =>
    receipts.set('countries', receipts.values.countries.map((country) => (country.countryCode === code ? { ...country, receipt: { ...country.receipt, ...patch } } : country)));

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <SettingsSection title={t.company} hint={t.companyHint} draft={company}>
        <Grid>
          <TextField label={t.companyName} value={company.values.company.name} onChange={(name) => company.set('company', { ...company.values.company, name })} />
        </Grid>
        <Stack direction="row" align="center" gap={vars.spacing[3]}>
          {company.values.company.logo ? <Thumbnail src={company.values.company.logo.dataUrl} name={company.values.company.name} size={vars.sizes.thumbnail.md} /> : <BrandLogo size="md" />}
          <FileField label={t.logo} accept="image/*" value={company.values.company.logo ?? null} onChange={(logo) => company.set('company', { ...company.values.company, logo: logo ?? undefined })} />
        </Stack>
        <SegmentedControl<ReceiptLanguage>
          label={t.receiptLanguage}
          value={company.values.receiptLanguage}
          onChange={(value) => company.set('receiptLanguage', value)}
          options={(['en', 'ar', 'both'] as const).map((value) => ({ value, label: t.languages[value] }))}
        />
      </SettingsSection>
      <SettingsSection title={t.receipts} hint={t.receiptsHint} draft={receipts}>
        {receipts.values.countries.map((country) => (
          <Card key={country.countryCode} title={format.country(country.countryCode)} background={vars.colors.surfaceMuted}>
            <LocalizedField label={t.header} value={country.receipt.header} onChange={(header) => setReceipt(country.countryCode, { header })} />
            <LocalizedField label={t.footer} value={country.receipt.footer} onChange={(footer) => setReceipt(country.countryCode, { footer })} />
            <LocalizedField label={t.returnPolicy} value={country.receipt.returnPolicy} onChange={(returnPolicy) => setReceipt(country.countryCode, { returnPolicy })} />
            <div className={styles.preview} aria-label={t.preview}>
              {country.receipt.showLogo && (company.values.company.logo ? <Thumbnail src={company.values.company.logo.dataUrl} name={company.values.company.name} /> : <BrandLogo size="sm" />)}
              {company.values.receiptLanguage !== 'ar' && <Text variant="h4" align="center">{country.receipt.header.en}</Text>}
              {company.values.receiptLanguage !== 'en' && <Text variant="h4" align="center">{country.receipt.header.ar}</Text>}
              <Text variant="caption" align="center">{`${country.registration.legalName} · ${country.registration.vatNumber || t.noVatNumber}`}</Text>
              <span className={styles.rule} />
              {company.values.receiptLanguage !== 'ar' && <Text variant="caption" align="center">{country.receipt.returnPolicy.en}</Text>}
              {company.values.receiptLanguage !== 'en' && <Text variant="caption" align="center">{country.receipt.returnPolicy.ar}</Text>}
              {company.values.receiptLanguage !== 'ar' && <Text variant="caption" align="center">{country.receipt.footer.en}</Text>}
              {company.values.receiptLanguage !== 'en' && <Text variant="caption" align="center">{country.receipt.footer.ar}</Text>}
            </div>
          </Card>
        ))}
      </SettingsSection>
      <Card title={t.demo}>
        {confirmReset ? (
          <Notice
            tone="warning"
            action={
              <Stack direction="row" gap={vars.spacing[2]}>
                <Button variant="danger" size="sm" disabled={Boolean(action.busy)} onClick={() => action.run('reset', resetDatabase).then(() => setConfirmReset(false))}>
                  {t.resetDemo}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
                  {text.common.cancel}
                </Button>
              </Stack>
            }
          >
            {t.resetConfirm}
          </Notice>
        ) : (
          <Stack direction="row">
            <Button variant="secondary" onClick={() => setConfirmReset(true)}>
              {t.resetDemo}
            </Button>
          </Stack>
        )}
      </Card>
    </Stack>
  );
};
