import { BranchDefects, PageHeader, Stack } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// The branch manager reports defective or damaged items, follows each one, sends them back to the brand and
// writes off lost stock.
export const DefectsPage = () => {
  const { text } = useLocale();
  const t = text.staff.defects;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <BranchDefects />
    </Stack>
  );
};
