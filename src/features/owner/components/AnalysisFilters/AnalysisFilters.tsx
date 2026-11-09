import { useState } from 'react';
import { listProducts } from '@/shared/api';
import { Button, Card, CategorySelect, ColorSelect, FilterBar, Icon, SelectField, SizeSelect, Stack, TextField } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import type { SalesChannel } from '@/shared/types';
import type { AnalysisFilterKey } from '../../constants/analysis';
import { BranchSelect, BrandSelect } from '../ReferenceSelect';

// The filters of the owner's analysis pages (Reports, Stock), as analytics tools lay them out: a Filters button that
// opens a panel with every filter the current view uses, and the filters in use as chips ("Branch: Park Mall ×") with
// Clear filters. Values live in the address, so they carry across tabs and views and a link opens the same view.
export const useAnalysisFilters = (keys: readonly AnalysisFilterKey[]) => {
  const { text } = useLocale();
  const format = useFormat();
  const { users, settings } = useReference();
  const version = useLiveVersion();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [brandId, setBrandId] = useQueryState('brand', '');
  const [categoryId, setCategoryId] = useQueryState('category', '');
  const [productId, setProductId] = useQueryState('product', '');
  const [reasonId, setReasonId] = useQueryState('reason', '');
  const [cashierId, setCashierId] = useQueryState('staff', '');
  const [paymentMethodId, setPaymentMethodId] = useQueryState('payment', '');
  const [channel, setChannel] = useQueryState('channel', '');
  const [size, setSize] = useQueryState('size', '');
  const [color, setColor] = useQueryState('color', '');
  const [weeks, setWeeks] = useQueryState('weeks', '');
  const productsState = useAsync(() => (keys.includes('product') ? listProducts({}) : Promise.resolve([])), [version, keys.includes('product')]);
  const products = productsState.status === 'success' ? productsState.data.map((row) => row.product) : [];
  const t = text.owner.reports;
  const shows = (key: AnalysisFilterKey) => keys.includes(key);
  const on = (key: AnalysisFilterKey, value: string) => (shows(key) && value ? value : undefined);

  // Only the filters this view uses count, so one left from another view never narrows this one unseen.
  const values = {
    branchId: on('branch', branchId),
    brandId: on('brand', brandId),
    categoryId: on('category', categoryId),
    productId: on('product', productId),
    returnReasonId: on('reason', reasonId),
    cashierId: on('staff', cashierId),
    paymentMethodId: on('payment', paymentMethodId),
    channel: on('channel', channel) as SalesChannel | undefined,
    size: on('size', size),
    color: on('color', color),
    weeks: on('weeks', weeks) ? Number(weeks) : undefined,
  };

  const chips = [
    values.branchId && { key: 'branch', label: text.owner.fields.branch, value: format.branch(branchId), clear: () => setBranchId('') },
    values.brandId && { key: 'brand', label: text.owner.fields.brand, value: format.brand(brandId), clear: () => setBrandId('') },
    values.categoryId && { key: 'category', label: text.owner.fields.category, value: format.category(categoryId), clear: () => setCategoryId('') },
    values.productId && { key: 'product', label: text.owner.fields.product, value: products.find((product) => product.id === productId)?.name ?? '', clear: () => setProductId('') },
    values.returnReasonId && { key: 'reason', label: t.columns.returnReason, value: format.text(settings.lists.returnReasons.find((option) => option.id === reasonId)?.label), clear: () => setReasonId('') },
    values.cashierId && { key: 'staff', label: t.groupings.cashier, value: format.user(cashierId), clear: () => setCashierId('') },
    values.paymentMethodId && { key: 'payment', label: t.groupings.paymentMethod, value: format.payment(paymentMethodId), clear: () => setPaymentMethodId('') },
    values.channel && { key: 'channel', label: t.groupings.channel, value: t.channels[channel as SalesChannel], clear: () => setChannel('') },
    values.size && { key: 'size', label: text.owner.fields.size, value: size, clear: () => setSize('') },
    values.color && { key: 'color', label: text.owner.fields.color, value: color, clear: () => setColor('') },
    values.weeks && { key: 'weeks', label: t.weeks, value: weeks, clear: () => setWeeks('') },
  ].filter((chip): chip is { key: string; label: string; value: string; clear: () => void } => Boolean(chip));
  const available = keys.filter((key) => key !== 'period').length > 0;

  const button = available && (
    <Button variant="secondary" onClick={() => setOpen(!open)}>
      <Icon name="filter" />
      {chips.length ? `${text.common.filters} (${format.number(chips.length)})` : text.common.filters}
    </Button>
  );

  const panel = open && available && (
    <Card
      title={text.common.filters}
      actions={
        <Button size="sm" variant="muted" onClick={() => setOpen(false)}>
          {text.common.close}
        </Button>
      }
    >
      <FilterBar>
        {shows('branch') && <BranchSelect kinds={['store', 'online', 'warehouse']} includeArchived allLabel={text.owner.fields.allBranches} value={branchId} onChange={setBranchId} />}
        {shows('brand') && <BrandSelect allLabel={text.owner.fields.allBrands} value={brandId} onChange={setBrandId} />}
        {shows('category') && <CategorySelect allLabel={text.owner.fields.allCategories} value={categoryId} onChange={setCategoryId} />}
        {shows('product') && (
          <SelectField
            label={text.owner.fields.product}
            placeholder={t.allProducts}
            value={productId}
            onChange={setProductId}
            options={products.filter((product) => (!brandId || product.brandId === brandId) && (!categoryId || product.categoryId === categoryId)).map((product) => ({ value: product.id, label: product.name, group: format.brand(product.brandId) }))}
          />
        )}
        {shows('reason') && <SelectField label={t.columns.returnReason} placeholder={t.allReasons} value={reasonId} onChange={setReasonId} options={settings.lists.returnReasons.map((option) => ({ value: option.id, label: format.text(option.label) }))} />}
        {shows('staff') && <SelectField label={t.groupings.cashier} placeholder={text.owner.fields.allStaff} value={cashierId} onChange={setCashierId} options={users.filter((user) => user.branchIds.length > 0).map((user) => ({ value: user.id, label: user.name }))} />}
        {shows('payment') && <SelectField label={t.groupings.paymentMethod} placeholder={text.common.all} value={paymentMethodId} onChange={setPaymentMethodId} options={settings.paymentMethods.map((method) => ({ value: method.id, label: format.text(method.name) }))} />}
        {shows('channel') && <SelectField label={t.groupings.channel} placeholder={text.common.all} value={channel} onChange={setChannel} options={(['store', 'online'] as const).map((value) => ({ value, label: t.channels[value] }))} />}
        {shows('size') && <SizeSelect allLabel={text.common.all} value={size} onChange={setSize} />}
        {shows('color') && <ColorSelect allLabel={text.common.all} value={color} onChange={setColor} />}
        {shows('weeks') && <TextField label={t.weeks} type="number" min={1} value={weeks} placeholder={String(settings.slowMoverWeeks)} onChange={setWeeks} />}
      </FilterBar>
    </Card>
  );

  const chipRow = chips.length > 0 && (
    <Stack direction="row" wrap gap={vars.spacing[2]} align="center">
      {chips.map((chip) => (
        <Button key={chip.key} size="sm" variant="secondary" onClick={chip.clear}>
          {`${chip.label}: ${chip.value}`}
          <Icon name="close" />
        </Button>
      ))}
      <Button size="sm" variant="muted" onClick={() => chips.forEach((chip) => chip.clear())}>
        {text.common.clearFilters}
      </Button>
    </Stack>
  );

  return { values, button, panel, chips: chipRow };
};
