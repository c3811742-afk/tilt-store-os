import { BranchDefects } from '@/shared/components';
import { useLocale } from '@/shared/hooks';
import { InspectionSection } from './InspectionSection';

// The storekeeper's inspection and defects: returned items to check, every defect with who carries its cost and
// photos, defects found later in storage against their batch, and write-offs. Report a defect and Write off lost
// items are in the page header.
export const DefectsPage = () => {
  const { text } = useLocale();
  const t = text.storekeeper.inspection;
  return (
    <BranchDefects title={t.title} showLiability showPhotos foundAtOptions={['storage', 'receiving', 'store', 'customerReturn']}>
      <InspectionSection />
    </BranchDefects>
  );
};
