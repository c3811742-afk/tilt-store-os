import { useQueryState } from './useQueryState';
import { presetRange, today, type DateRange, type PeriodPreset } from '@/shared/utils';

// The period a page shows, kept in the address (?period=week&from=...&to=...), so a link opens the same view.
export const usePeriod = (fallback: Exclude<PeriodPreset, 'custom'> = 'month') => {
  const [preset, setPreset] = useQueryState<PeriodPreset>('period', fallback);
  const [from, setFrom] = useQueryState('from', '');
  const [to, setTo] = useQueryState('to', '');
  const range: DateRange =
    preset === 'custom' ? { from: from || presetRange(fallback).from, to: to && to >= (from || '') ? to : today() } : presetRange(preset);
  return { preset, setPreset, range, setFrom, setTo };
};

export type Period = ReturnType<typeof usePeriod>;
