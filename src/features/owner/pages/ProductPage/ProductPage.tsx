import { useState } from 'react';
import { useParams } from 'react-router';
import { getProduct, setProductArchived, updateProduct } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Icon, Notice, PageHeader, Stack, Tabs, Thumbnail } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { ProductDetailsForm } from './ProductDetailsForm';
import { VariantsTab } from './VariantsTab';
import { PricingTab } from './PricingTab';
import { ProductStockTab } from './ProductStockTab';

type ProductTab = 'details' | 'variants' | 'pricing' | 'stock';

export const ProductPage = () => {
  const { productId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getProduct(productId), [productId, version]);
  const [tab, setTab] = useQueryState<ProductTab>('tab', 'details');
  const [saved, setSaved] = useState(false);
  const action = useAction();
  const t = text.owner.products;

  return (
    <AsyncContent state={state}>
      {(data) => {
        const { product } = data;
        const sizes = [...new Set(product.variants.filter((variant) => !variant.archived).map((variant) => variant.size))];
        const colors = [...new Set(product.variants.filter((variant) => !variant.archived).map((variant) => variant.color))];
        return (
          <Stack gap={vars.spacing[5]}>
            <PageHeader
              back={{ to: routes.owner.products, label: t.title }}
              title={
                <Stack direction="row" align="center" gap={vars.spacing[3]}>
                  <Thumbnail src={product.photo} name={product.name} size={vars.sizes.thumbnail.md} />
                  {product.name}
                </Stack>
              }
              subtitle={`${format.brand(product.brandId)} · ${format.category(product.categoryId)}`}
              actions={
                <>
                  {product.archived && <Badge>{text.common.archived}</Badge>}
                  <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('archive', () => setProductArchived(product.id, !product.archived))}>
                    <Icon name={product.archived ? 'restore' : 'archive'} />
                    {product.archived ? text.common.restore : text.common.archive}
                  </Button>
                </>
              }
            />
            {product.archived && <Notice tone="info">{t.archivedNotice}</Notice>}
            {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            <Tabs<ProductTab>
              label={product.name}
              value={tab}
              onChange={(next) => {
                setSaved(false);
                setTab(next);
              }}
              tabs={[
                { value: 'details', label: t.tabs.details },
                { value: 'variants', label: t.tabs.variants, count: product.variants.filter((variant) => !variant.archived).length },
                { value: 'pricing', label: t.tabs.pricing },
                { value: 'stock', label: t.tabs.stock },
              ]}
            >
              {saved && <Notice tone="success">{text.common.saved}</Notice>}
              {tab === 'details' && (
                <Card>
                  <ProductDetailsForm
                    initial={{ brandId: product.brandId, categoryId: product.categoryId, name: product.name, photo: product.photo, season: product.season, collection: product.collection, sizes, colors, cost: product.cost, prices: product.prices }}
                    showPricing={false}
                    currencies={data.currencies}
                    submitLabel={text.common.saveChanges}
                    onSubmit={async (input) => {
                      await updateProduct(product.id, input);
                      setSaved(true);
                    }}
                  />
                </Card>
              )}
              {tab === 'variants' && <VariantsTab data={data} onSaved={() => setSaved(true)} />}
              {tab === 'pricing' && <PricingTab data={data} onSaved={() => setSaved(true)} />}
              {tab === 'stock' && <ProductStockTab data={data} />}
            </Tabs>
          </Stack>
        );
      }}
    </AsyncContent>
  );
};
