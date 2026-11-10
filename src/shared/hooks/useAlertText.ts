import type { NotificationView } from '@/shared/api';
import type { StaffAlertKind } from '@/shared/types';
import { fillText } from '@/shared/utils';
import { useFormat } from './useFormat';
import { useLocale } from './useLocale';
import { useReference } from './useReference';

// The title and text of an alert, in the active language, filled with its details.
// Owner alerts are in text.owner.alerts, alerts only branch staff get are in text.staff.alerts.
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const storedMoney = /^([A-Z]{3}) (-?[\d.]+)$/;

export const useAlertText = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const staffAlerts = text.staff.alerts;
  const decisions: Record<string, string> = text.staff.decisions;
  const actionNames: Record<string, string> = text.owner.activity.actions;
  return (item: Pick<NotificationView, 'kind' | 'params'>) => {
    const copy = item.kind in staffAlerts ? staffAlerts[item.kind as StaffAlertKind] : text.owner.alerts.kinds[item.kind as Exclude<typeof item.kind, StaffAlertKind>];
    // Words stored as keys (a decision, "discount" or "refund", "fee" or "payout") show in the reader's language.
    const words: Record<string, string> = text.owner.alerts.words;
    const money = (value: string) => {
      const found = storedMoney.exec(value);
      return found ? format.money(Number(found[2]), found[1]) : value;
    };
    const word = (value?: string) => (value === undefined ? undefined : (words[value] ?? value));
    const params = {
      ...item.params,
      ...(item.params.decision ? { decision: decisions[item.params.decision] ?? item.params.decision } : {}),
      ...(item.params.kind ? { kind: word(item.params.kind) ?? '' } : {}),
      ...(item.params.what ? { what: word(item.params.what) ?? '' } : {}),
      // A flagged action is stored by its key (void, writeOff...) and shows as the activity log names it.
      ...(item.params.action ? { action: actionNames[item.params.action] ?? item.params.action } : {}),
      // An amount stored as "EGP 4000" shows as "EGP 4,000"; a date stored as 2026-11-05 shows as "Nov 5, 2026".
      ...(item.params.amount ? { amount: money(item.params.amount) } : {}),
      ...(item.params.date && isoDate.test(item.params.date) ? { date: format.date(item.params.date) } : {}),
      // A batch's cost per piece is in the base currency.
      ...(item.kind === 'batchCostChanged' && item.params.from ? { from: format.money(Number(item.params.from), settings.baseCurrency), to: format.money(Number(item.params.to), settings.baseCurrency) } : {}),
    };
    return { title: fillText(copy.title, params), body: fillText(copy.body, params) };
  };
};
