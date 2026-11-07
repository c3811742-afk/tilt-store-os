import type { CountLineView, CountView } from '@/shared/api';

// A line while counting; scanned items that were not expected have no expected quantity yet.
export type CountSheetLine = Omit<CountLineView, 'reasonId'> & { reasonId?: string };

export interface CountSheetProps {
  view: CountView; // an open count
  onSubmitted?: () => void;
}
