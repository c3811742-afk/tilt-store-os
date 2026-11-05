import { SelectField } from '@/shared/components';
import { useFormat, useLocale, useReference } from '@/shared/hooks';
import type { BranchKind } from '@/shared/types';

interface BaseProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string; // the empty choice; without it a value is required
  error?: string;
  width?: string;
}

// A branch picker. By default every branch that sells (stores and the online store), not archived ones.
export const BranchSelect = ({ kinds = ['store', 'online'], includeArchived = false, ...props }: BaseProps & { kinds?: BranchKind[]; includeArchived?: boolean }) => {
  const { branches } = useReference();
  const { text } = useLocale();
  return (
    <SelectField
      label={props.label ?? (kinds.includes('warehouse') ? text.owner.fields.branchOrWarehouse : text.owner.fields.branch)}
      placeholder={props.allLabel}
      value={props.value}
      onChange={props.onChange}
      error={props.error}
      width={props.width}
      options={branches.filter((branch) => kinds.includes(branch.kind) && (includeArchived || !branch.archived)).map((branch) => ({ value: branch.id, label: branch.name }))}
    />
  );
};

export const BrandSelect = (props: BaseProps) => {
  const { brands } = useReference();
  const { text } = useLocale();
  return (
    <SelectField
      label={props.label ?? text.owner.fields.brand}
      placeholder={props.allLabel}
      value={props.value}
      onChange={props.onChange}
      error={props.error}
      width={props.width}
      options={[...brands].sort((a, b) => a.name.localeCompare(b.name)).map((brand) => ({ value: brand.id, label: brand.name }))}
    />
  );
};

export const CategorySelect = (props: BaseProps & { includeArchived?: boolean }) => {
  const { categories } = useReference();
  const { text } = useLocale();
  const format = useFormat();
  return (
    <SelectField
      label={props.label ?? text.owner.fields.category}
      placeholder={props.allLabel}
      value={props.value}
      onChange={props.onChange}
      error={props.error}
      width={props.width}
      options={categories.filter((category) => props.includeArchived || !category.archived).map((category) => ({ value: category.id, label: format.text(category.name) }))}
    />
  );
};
