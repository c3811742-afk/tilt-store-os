import { vars } from '@/shared/theme';
import type { ThumbnailProps } from './Thumbnail.types';

export const thumbnailDefaults: Required<Pick<ThumbnailProps, 'name' | 'size' | 'round'>> = {
  name: '',
  size: vars.sizes.thumbnail.sm,
  round: false,
};
