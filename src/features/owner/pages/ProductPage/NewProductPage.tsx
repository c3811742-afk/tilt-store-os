import { useNavigate } from 'react-router';
import { createProduct } from '@/shared/api';
import { Card, PageHeader, Stack } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { ProductDetailsForm } from './ProductDetailsForm';

export const NewProductPage = () => {
  const { text } = useLocale();
  const { branches } = useReference();
  const navigate = useNavigate();
  const [brandId] = useQueryState('brand', '');
  const currencies = [...new Set(branches.filter((branch) => !branch.archived && branch.kind !== 'warehouse').map((branch) => branch.currency))];
  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={text.owner.products.add} back={{ to: routes.owner.products, label: text.owner.products.title }} />
      <Card>
        <ProductDetailsForm
          initial={{ brandId, categoryId: '', name: '', season: '', collection: '', sizes: [], colors: [], cost: 0, prices: {} }}
          showPricing
          currencies={currencies}
          submitLabel={text.owner.products.add}
          onSubmit={async (input) => {
            const product = await createProduct(input);
            navigate(toPath(routes.owner.product, { productId: product.id }));
          }}
        />
      </Card>
    </Stack>
  );
};
