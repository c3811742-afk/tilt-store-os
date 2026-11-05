import { SelectField } from '@/shared/components';
import { currencyCodes } from '@/shared/constants';
import { useFormat, useLocale, useReference } from '@/shared/hooks';

export interface CurrencySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  usedOnly?: boolean; // only the currencies the branches and the base currency use
  hint?: string;
}

// Any ISO currency, named in the active language. The ones the store uses come first.
export const CurrencySelect = ({ value, onChange, label, usedOnly = false, hint }: CurrencySelectProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const { branches, settings } = useReference();
  const used = [...new Set([settings.baseCurrency, ...branches.filter((branch) => !branch.archived).map((branch) => branch.currency)])];
  const others = usedOnly ? [] : currencyCodes.filter((code) => !used.includes(code));
  return (
    <SelectField
      label={label ?? text.common.currency}
      hint={hint}
      value={value}
      onChange={onChange}
      options={[...used, ...others].map((code) => ({ value: code, label: format.currency(code) }))}
    />
  );
};
