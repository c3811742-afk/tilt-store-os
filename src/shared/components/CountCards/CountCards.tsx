import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, withDefaults } from '@/shared/utils';
import { Badge } from '../Badge';
import { Card } from '../Card';
import { Notice } from '../Notice';
import { Stack } from '../Stack';
import { Text } from '../Text';
import { countCardsDefaults, countStateTone } from './CountCards.defaults';
import type { CountCardsProps } from './CountCards.types';

// Stock counts as cards: number, what was counted, its state and who started it. Each card opens the count.
export const CountCards = (props: CountCardsProps) => {
  const { views, pathFor } = withDefaults(countCardsDefaults, props);
  const { text } = useLocale();
  const format = useFormat();
  const t = text.staff.counts;

  if (!views.length) return <Notice>{t.none}</Notice>;
  return (
    <Stack gap={vars.spacing[3]}>
      {views.map(({ count, totalDifference }) => {
        const scope = count.scope;
        const what = scope?.kind === 'brand' ? format.brand(scope.brandId) : scope?.kind === 'location' ? t.scopes.location : t.scopes.full;
        return (
          <Card
            key={count.id}
            to={pathFor?.(count.id)}
            title={`${count.number} · ${what}`}
            actions={
              <>
                {count.blind && <Badge>{t.blindTag}</Badge>}
                {totalDifference ? <Badge variant="warning">{fillText(t.totalDifference, { pieces: format.number(totalDifference) })}</Badge> : null}
                <Badge variant={countStateTone[count.status]}>{t.states[count.status]}</Badge>
              </>
            }
          >
            <Text variant="caption" color={vars.colors.textMuted}>
              {fillText(t.summary, { lines: format.number(count.lines.length), user: format.user(count.byId), date: format.dateTime(count.at) })}
            </Text>
          </Card>
        );
      })}
    </Stack>
  );
};
