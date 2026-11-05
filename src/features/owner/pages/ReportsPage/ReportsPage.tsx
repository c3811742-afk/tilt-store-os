import { reportIds } from '@/shared/api';
import { Card, Grid, PageHeader, Stack, Text } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// Every report, grouped by what it answers.
export const ReportsPage = () => {
  const { text } = useLocale();
  const t = text.owner.reports;
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      <Grid>
        {reportIds.map((id) => (
          <Card key={id} to={toPath(routes.owner.report, { reportId: id })} title={t.list[id].title} gap={vars.spacing[2]}>
            <Text variant="bodySm" color={vars.colors.textMuted}>
              {t.list[id].description}
            </Text>
          </Card>
        ))}
      </Grid>
    </Stack>
  );
};
