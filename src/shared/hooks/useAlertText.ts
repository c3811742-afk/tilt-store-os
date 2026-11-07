import type { NotificationView } from '@/shared/api';
import type { StaffAlertKind } from '@/shared/types';
import { fillText } from '@/shared/utils';
import { useLocale } from './useLocale';

// The title and text of an alert, in the active language, filled with its details.
// Owner alerts are in text.owner.alerts, alerts only branch staff get are in text.staff.alerts.
export const useAlertText = () => {
  const { text } = useLocale();
  const staffAlerts = text.staff.alerts;
  const decisions: Record<string, string> = text.staff.decisions;
  return (item: Pick<NotificationView, 'kind' | 'params'>) => {
    const copy = item.kind in staffAlerts ? staffAlerts[item.kind as StaffAlertKind] : text.owner.alerts.kinds[item.kind as Exclude<typeof item.kind, StaffAlertKind>];
    // A decision ("approved", "rejected"...) is stored as a key, so it shows in the reader's language.
    const params = item.params.decision ? { ...item.params, decision: decisions[item.params.decision] ?? item.params.decision } : item.params;
    return { title: fillText(copy.title, params), body: fillText(copy.body, params) };
  };
};
