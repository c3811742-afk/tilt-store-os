import { useState } from 'react';
import { addProductWhileReceiving, addVariantWhileReceiving, listBrandProducts, type VariantHit } from '@/shared/api';
import { Button, CategorySelect, Modal, Notice, SelectField, Stack, Text, TextField } from '@/shared/components';
import { useAsync, useBranchScope, useErrorMessage, useForm, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';

interface AddVariantModalProps {
  brandId: string;
  onClose: () => void;
  onAdded: (hit: VariantHit) => void;
}

// A size or colour the brand delivered that the system doesn't have yet, with its barcode (or a new one).
export const AddVariantModal = ({ brandId, onClose, onAdded }: AddVariantModalProps) => {
  const { text } = useLocale();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [version, setVersion] = useState(0);
  const products = useAsync(() => listBrandProducts(brandId), [brandId, version], () => false);
  const t = text.storekeeper.receiving;
  const required = (value: string) => (value.trim() ? null : text.validation.required);
  const form = useForm({ productId: '', size: '', color: '', barcode: '' }, { productId: (value) => (value ? null : t.chooseProduct), size: required, color: required });

  const onSubmit = form.submit(async (values) => onAdded(await addVariantWhileReceiving(branchId, values)));

  if (creatingProduct)
    return (
      <AddProductModal
        brandId={brandId}
        onClose={() => setCreatingProduct(false)}
        onAdded={(productId) => {
          setCreatingProduct(false);
          setVersion((current) => current + 1);
          form.setValue('productId', productId);
        }}
      />
    );

  const list = products.status === 'success' ? products.data : [];
  return (
    <Modal
      open
      onClose={onClose}
      title={t.variantTitle}
      onSubmit={onSubmit}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={form.submitting}>
            {text.common.add}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
        <SelectField label={t.product} placeholder={t.chooseProduct} value={form.values.productId} onChange={(value) => form.setValue('productId', value)} error={form.errors.productId} options={list.map((product) => ({ value: product.id, label: product.name }))} />
        <Stack direction="row" justify="flex-end">
          <Button size="sm" variant="muted" onClick={() => setCreatingProduct(true)}>
            {t.addProduct}
          </Button>
        </Stack>
        <Stack direction="row" wrap gap={vars.spacing[3]}>
          <SelectField label={t.size} placeholder={t.size} value={form.values.size} onChange={(value) => form.setValue('size', value)} error={form.errors.size} options={settings.sizes.map((size) => ({ value: size, label: size }))} width={vars.sizes.field.narrow} />
          <SelectField label={t.color} placeholder={t.color} value={form.values.color} onChange={(value) => form.setValue('color', value)} error={form.errors.color} options={settings.colors.map((color) => ({ value: color, label: color }))} width={vars.sizes.field.narrow} />
        </Stack>
        <TextField label={t.barcode} hint={t.barcodeHint} inputMode="numeric" {...form.field('barcode')} />
      </Stack>
    </Modal>
  );
};

interface AddProductModalProps {
  brandId: string;
  onClose: () => void;
  onAdded: (productId: string) => void;
}

// A product the store never had: its name and category only. The owner prices it before it can be sold.
const AddProductModal = ({ brandId, onClose, onAdded }: AddProductModalProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const { branchId } = useBranchScope();
  const t = text.storekeeper.receiving;
  const form = useForm({ name: '', categoryId: '' }, { name: (value) => (value.trim() ? null : text.validation.required), categoryId: (value) => (value ? null : text.validation.required) });
  const onSubmit = form.submit(async (values) => onAdded((await addProductWhileReceiving(branchId, { brandId, ...values })).id));

  return (
    <Modal
      open
      onClose={onClose}
      title={t.productTitle}
      onSubmit={onSubmit}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={form.submitting}>
            {text.common.add}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[4]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {t.productHint}
        </Text>
        {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
        <TextField label={t.name} {...form.field('name')} autoFocus />
        <CategorySelect label={t.category} allLabel={text.common.notSet} value={form.values.categoryId} onChange={(value) => form.setValue('categoryId', value)} error={form.errors.categoryId} />
      </Stack>
    </Modal>
  );
};
