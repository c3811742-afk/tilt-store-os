import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Notice } from '../Notice';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { transferCardsDefaults, transferStageTone } from './TransferCards.defaults';
import type { TransferCardsProps } from './TransferCards.types';

// Transfers as cards: number, route, step, size and anything to review. Each card opens the transfer.
export const TransferCards = (props: TransferCardsProps) => {
  const { views, pathFor, empty } = withDefaults(transferCardsDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const t = text.staff.transfers;

  if (!views.length) return <Notice>{empty ?? t.none}</Notice>;
  return (
    <Stack gap={vars.spacing[3]}>
      {views.map((view) => {
        const pieces = view.transfer.lines.reduce((sum, line) => sum + line.qty, 0);
        return (
          <Card
            key={view.transfer.id}
            to={pathFor?.(view.transfer.id)}
            title={`${view.transfer.number} · ${format.branch(view.transfer.fromBranchId)} → ${format.branch(view.transfer.toBranchId)}`}
            actions={
              <>
                {view.differenceOpen && <Badge variant="danger">{t.differenceTitle}</Badge>}
                <Badge variant={transferStageTone[view.stage]}>{t.stages[view.stage]}</Badge>
              </>
            }
          >
            <Text variant="caption" color={vars.colors.textMuted}>
              {[
                fillText(t.lineSummary, { lines: format.number(view.transfer.lines.length), pieces: format.number(pieces) }),
                format.dateTime(view.transfer.createdAt),
                view.transfer.driverId ? `${t.driver}: ${format.user(view.transfer.driverId)}` : undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Card>
        );
      })}
    </Stack>
  );
};
