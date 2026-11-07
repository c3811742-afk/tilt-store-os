import { BranchDefects, PageHeader, Stack } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { InspectionSection } from './InspectionSection';

// The storekeeper's inspection and defects: returned items to check, every defect with who carries its cost and
// photos, defects found later in storage against their batch, and write-offs.
export const DefectsPage = () => {
  const { text } = useLocale();
  const t = text.storekeeper.inspection;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <InspectionSection />
      <BranchDefects showLiability showPhotos foundAtOptions={['storage', 'receiving', 'store', 'customerReturn']} />
    </Stack>
  );
};
