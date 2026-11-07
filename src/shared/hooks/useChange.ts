import type { Trend } from '@/shared/components/StatCard/StatCard.types';
import { useFormat } from './useFormat';
import { useLocale } from './useLocale';
import { changePercent, fillText } from '@/shared/utils';

// "Up 4.8% from the previous period": the line under a number, with its direction.
// `lowerIsBetter` for costs and losses, so a drop shows as good news.
export const useChange = () => {
  const { text } = useLocale();
  const format = useFormat();
  return (current: number, previous: number, options: { lowerIsBetter?: boolean; label?: string } = {}) => {
    const change = changePercent(current, previous);
    const label = options.label ?? text.owner.compare.previousPeriod;
    if (change === null) return { detail: fillText(text.owner.compare.noPrevious, { period: label }), trend: 'flat' as Trend };
    const rounded = Math.round(change * 10) / 10;
    if (rounded === 0) return { detail: fillText(text.owner.compare.same, { period: label }), trend: 'flat' as Trend };
    const up = rounded > 0;
    const good = options.lowerIsBetter ? !up : up;
    return {
      detail: fillText(up ? text.owner.compare.up : text.owner.compare.down, { percent: format.percent(Math.abs(rounded)), period: label }),
      trend: (good ? 'up' : 'down') as Trend,
    };
  };
};
