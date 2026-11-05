import type { ReactNode } from 'react';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface NoticeProps {
  children?: ReactNode;
  tone?: NoticeTone;
  title?: ReactNode;
  action?: ReactNode; // a button at the end (e.g. "Review")
}
