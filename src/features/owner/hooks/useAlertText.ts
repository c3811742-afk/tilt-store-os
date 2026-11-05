import type { NotificationView } from '@/shared/api';
import { useLocale } from '@/shared/hooks';
import { fillText } from '@/shared/utils';

// The title and text of an alert, in the active language, filled with its details.
export const useAlertText = () => {
  const { text } = useLocale();
  return (item: Pick<NotificationView, 'kind' | 'params'>) => {
    const copy = text.owner.alerts.kinds[item.kind];
    return { title: fillText(copy.title, item.params), body: fillText(copy.body, item.params) };
  };
};
