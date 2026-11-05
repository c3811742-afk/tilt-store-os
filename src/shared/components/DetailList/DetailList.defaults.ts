import { vars } from '@/shared/theme';
import type { DetailListProps } from './DetailList.types';

export const detailListDefaults: Required<Pick<DetailListProps, 'items' | 'minColumnWidth'>> = {
  items: [],
  minColumnWidth: vars.sizes.card.minWidth,
};
