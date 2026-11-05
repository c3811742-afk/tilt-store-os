import { Badge, Card, DetailList, Stack, Text } from '@/shared/components';
import { useFormat, useLocale } from '@/shared/hooks';
import type { Brand } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, toIsoDate } from '@/shared/utils';
import { useTermsSummary } from '../../hooks/useTermsSummary';

// Every version of a brand's terms, newest first, with who changed it and from when it applies.
export const TermsHistory = ({ brand }: { brand: Brand }) => {
  const { text } = useLocale();
  const format = useFormat();
  const summary = useTermsSummary();
  const t = text.owner.brands;
  const versions = [...brand.termsHistory].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.at.localeCompare(a.at));
  const day = toIsoDate();
  const current = versions.find((version) => version.effectiveFrom <= day);

  return (
    <Stack gap={vars.spacing[3]}>
      {versions.map((version) => (
        <Card
          key={version.id}
          title={fillText(t.fromDate, { date: format.date(version.effectiveFrom) })}
          actions={
            version === current ? <Badge variant="success">{t.current}</Badge> : version.effectiveFrom > day ? <Badge variant="info">{t.upcoming}</Badge> : <Badge>{t.past}</Badge>
          }
        >
          <DetailList items={summary.items(version.terms)} />
          <Text variant="caption" color={vars.colors.textMuted}>
            {fillText(t.changedBy, { user: format.user(version.byId), date: format.dateTime(version.at) })}
            {version.note ? ` · ${version.note}` : ''}
          </Text>
        </Card>
      ))}
    </Stack>
  );
};
