import type { IconName } from '@/shared/assets';
import { vars } from '@/shared/theme';
import type { NoticeProps, NoticeTone } from './Notice.types';

export const noticeTones: Record<NoticeTone, { color: string; icon: IconName }> = {
  info: { color: vars.colors.textSecondary, icon: 'info' },
  success: { color: vars.colors.success, icon: 'checkCircle' },
  warning: { color: vars.colors.warning, icon: 'warning' },
  danger: { color: vars.colors.danger, icon: 'alert' },
};

export const noticeDefaults: Required<Pick<NoticeProps, 'tone'>> = {
  tone: 'info',
};
