import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { changeBrandTerms, getBrand, setBrandAgreement, setBrandStatus, updateBrandProfile } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, DetailList, FileField, Icon, Notice, PageHeader, Stack, Tabs, Text, TextField, Thumbnail } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { downloadDataUrl, fillText, today } from '@/shared/utils';
import { BrandTermsFields } from '../../components/BrandTermsFields';
import { useTermsSummary } from '../../hooks/useTermsSummary';
import { BrandProfileForm } from './BrandProfileForm';
import { TermsHistory } from './TermsHistory';

type BrandTab = 'overview' | 'profile' | 'terms' | 'history' | 'agreement';

export const BrandPage = () => {
  const { brandId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getBrand(brandId), [brandId, version]);
  const [tab, setTab] = useQueryState<BrandTab>('tab', 'overview');
  const action = useAction();
  const summary = useTermsSummary();
  const [draftTerms, setDraftTerms] = useState<Parameters<typeof changeBrandTerms>[1] | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const t = text.owner.brands;

  return (
    <AsyncContent state={state}>
      {({ brand, terms, activeProductCount, productCount, lockedUntil }) => {
        const editing = draftTerms ?? terms;
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.owner.brands, label: t.title }}
              title={
                <Stack direction="row" align="center" gap={vars.spacing[3]}>
                  <Thumbnail src={brand.logo} name={brand.name} size={vars.sizes.thumbnail.md} />
                  {brand.name}
                </Stack>
              }
              subtitle={summary.deal(terms)}
              actions={
                <>
                  <Badge variant={brand.status === 'active' ? 'success' : 'neutral'}>{t.statuses[brand.status]}</Badge>
                  <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('status', () => setBrandStatus(brand.id, brand.status === 'active' ? 'paused' : 'active'))}>
                    <Icon name={brand.status === 'active' ? 'pause' : 'play'} />
                    {brand.status === 'active' ? t.pause : t.reactivate}
                  </Button>
                </>
              }
            />
            {brand.status === 'paused' && <Notice tone="warning">{t.pausedNotice}</Notice>}
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            <Tabs<BrandTab>
              label={brand.name}
              value={tab}
              onChange={(next) => {
                setSaved(false);
                setTab(next);
              }}
              tabs={[
                { value: 'overview', label: t.tabs.overview },
                { value: 'profile', label: t.tabs.profile },
                { value: 'terms', label: t.tabs.terms },
                { value: 'history', label: t.tabs.history, count: brand.termsHistory.length },
                { value: 'agreement', label: t.tabs.agreement },
              ]}
            >
              {saved && <Notice tone="success">{text.common.saved}</Notice>}
              {tab === 'overview' && (
                <Stack gap={vars.spacing[4]}>
                  <Card title={t.tabs.terms}>
                    <DetailList items={summary.items(terms)} />
                  </Card>
                  <Card title={t.tabs.profile}>
                    <DetailList
                      items={[
                        { key: 'contact', label: t.profile.contactName, value: brand.contactName || text.common.notSet },
                        { key: 'phone', label: t.profile.phone, value: brand.phone || text.common.notSet },
                        { key: 'email', label: t.profile.email, value: brand.email || text.common.notSet },
                        { key: 'instagram', label: t.profile.instagram, value: brand.instagram || text.common.notSet },
                        { key: 'contract', label: t.profile.contractStart, value: format.date(brand.contractStart) },
                        {
                          key: 'payment',
                          label: t.profile.paymentMethod,
                          value: brand.payment.method === 'bank' ? [t.profile.bank, brand.payment.bankName, brand.payment.accountNumber].filter(Boolean).join(' · ') : [t.profile.instapay, brand.payment.instapay].filter(Boolean).join(' · '),
                        },
                        {
                          key: 'products',
                          label: t.products,
                          value: <Link to={withQuery(routes.owner.products, { brand: brand.id })}>{fillText(t.productCount, { active: format.number(activeProductCount), all: format.number(productCount) })}</Link>,
                        },
                        { key: 'agreement', label: t.tabs.agreement, value: brand.agreement ? brand.agreement.name : text.common.notSet },
                      ]}
                    />
                  </Card>
                </Stack>
              )}
              {tab === 'profile' && (
                <Card>
                  <BrandProfileForm
                    initial={{ name: brand.name, logo: brand.logo, instagram: brand.instagram, contactName: brand.contactName, phone: brand.phone, email: brand.email, payment: brand.payment, contractStart: brand.contractStart }}
                    submitLabel={text.common.saveChanges}
                    onSubmit={async (profile) => {
                      await updateBrandProfile(brand.id, profile);
                      setSaved(true);
                    }}
                  />
                </Card>
              )}
              {tab === 'terms' && (
                <Card title={t.changeTerms}>
                  <Text variant="bodySm" color={vars.colors.textMuted}>
                    {t.changeTermsHint}
                  </Text>
                  {lockedUntil && <Notice tone="info">{fillText(t.lockedUntil, { date: format.date(lockedUntil) })}</Notice>}
                  <BrandTermsFields value={editing} onChange={setDraftTerms} />
                  <Stack direction="row" wrap gap={vars.spacing[3]} align="flex-end">
                    <TextField label={t.effectiveFrom} type="date" value={effectiveFrom} min={lockedUntil ?? undefined} onChange={setEffectiveFrom} width={vars.sizes.field.narrow} />
                    <TextField label={text.common.note} value={note} onChange={setNote} />
                    <Button
                      disabled={!draftTerms || Boolean(action.busy)}
                      onClick={async () => {
                        const done = await action.run('terms', () => changeBrandTerms(brand.id, editing, effectiveFrom, note || undefined));
                        if (done) {
                          setDraftTerms(null);
                          setNote('');
                          setSaved(true);
                        }
                      }}
                    >
                      {t.saveTerms}
                    </Button>
                  </Stack>
                </Card>
              )}
              {tab === 'history' && <TermsHistory brand={brand} />}
              {tab === 'agreement' && (
                <Card title={t.tabs.agreement}>
                  <Text variant="bodySm" color={vars.colors.textMuted}>
                    {t.agreementHint}
                  </Text>
                  {brand.agreement && (
                    <Stack direction="row" wrap align="center" gap={vars.spacing[3]}>
                      <Icon name="file" />
                      <Text as="span">{brand.agreement.name}</Text>
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {fillText(t.uploaded, { date: format.dateTime(brand.agreement.uploadedAt), user: format.user(brand.agreement.byId) })}
                      </Text>
                      <Button variant="secondary" size="sm" onClick={() => brand.agreement && downloadDataUrl(brand.agreement.dataUrl, brand.agreement.name)}>
                        <Icon name="download" />
                        {text.common.download}
                      </Button>
                    </Stack>
                  )}
                  <FileField
                    label={brand.agreement ? t.replaceAgreement : t.attachAgreement}
                    accept=".pdf,image/*,.doc,.docx"
                    value={null}
                    onChange={(file) => file && void action.run('agreement', () => setBrandAgreement(brand.id, file))}
                  />
                </Card>
              )}
            </Tabs>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
