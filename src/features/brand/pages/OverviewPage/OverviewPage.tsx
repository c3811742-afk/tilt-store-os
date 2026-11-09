import { getBrandOverview } from '@/shared/api';
import { AsyncContent, BarList, Card, Grid, Notice, PageHeader, PeriodFilter, Stack, StatCard } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAsync, useFormat, useLiveVersion, useLocale, usePeriod } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// The brand's start page: units sold and returned in the period, stock, items to restock, defects and promotions.
export const OverviewPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const period = usePeriod('month');
  const t = text.brandPortal.overview;
  const state = useAsync(() => getBrandOverview(period.range), [period.range.from, period.range.to, version]);

  return (
    <AsyncContent state={state}>
      {(data) => (
        <Stack gap={vars.spacing[5]}>
          <PageHeader title={fillText(t.title, { brand: data.brandName })} />
          <PeriodFilter period={period} />
          <Grid minColumnWidth={vars.sizes.card.minWidth}>
            <StatCard label={t.sold} value={format.number(data.sold)} to={routes.brand.sales} highlight />
            <StatCard label={t.returned} value={format.number(data.returned)} to={routes.brand.returns} />
            <StatCard label={t.inStock} value={format.number(data.inStock)} to={routes.brand.stock} />
            <StatCard label={t.low} value={format.number(data.lowItems)} to={withQuery(routes.brand.stock, { low: '1' })} />
            <StatCard label={t.defects} value={format.number(data.openDefects)} to={withQuery(routes.brand.returns, { tab: 'defects' })} />
            <StatCard label={t.promotions} value={format.number(data.runningPromotions)} to={routes.brand.promotions} />
          </Grid>
          <Card title={t.top}>
            {data.topProducts.length ? (
              <BarList label={t.top} items={data.topProducts.map((product) => ({ key: product.productId, label: product.name, value: product.units, display: format.number(product.units) }))} />
            ) : (
              <Notice>{t.noSales}</Notice>
            )}
          </Card>
        </Stack>
      )}
    </AsyncContent>
  );
};
