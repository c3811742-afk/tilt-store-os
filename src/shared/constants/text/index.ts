import type { Locale } from '@/shared/theme';
import type { TextShape } from '@/shared/types';
import { en } from './en';
import { ar } from './ar';

export type Text = TextShape<typeof en>;

export const texts: Record<Locale, Text> = { en, ar };
