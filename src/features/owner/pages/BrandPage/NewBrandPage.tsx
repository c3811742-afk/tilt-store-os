import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createBrand } from '@/shared/api';
import { Card, PageHeader, Stack } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { today } from '@/shared/utils';
import { BrandTermsFields } from '../../components/BrandTermsFields';
import { BrandProfileForm } from './BrandProfileForm';

// Adds a brand with its profile and its first terms (starting from the defaults in Policies).
export const NewBrandPage = () => {
  const { text } = useLocale();
  const { settings } = useReference();
  const navigate = useNavigate();
  const [terms, setTerms] = useState(settings.defaultBrandTerms);
  const t = text.owner.brands;

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.add} back={{ to: routes.owner.brands, label: t.title }} />
      <Card>
        <BrandProfileForm
          initial={{ name: '', instagram: '', contactName: '', phone: '', email: '', contractStart: today(), payment: { method: 'bank', bankName: '', accountName: '', accountNumber: '', instapay: '' } }}
          submitLabel={t.add}
          onCancel={() => navigate(routes.owner.brands)}
          onSubmit={async (profile) => {
            const brand = await createBrand(profile, terms);
            navigate(toPath(routes.owner.brand, { brandId: brand.id }));
          }}
          extra={
            <Card title={t.terms.title} background={vars.colors.surfaceMuted}>
              <BrandTermsFields value={terms} onChange={setTerms} />
            </Card>
          }
        />
      </Card>
    </Stack>
  );
};
