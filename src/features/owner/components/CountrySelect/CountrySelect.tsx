import { SelectField } from '@/shared/components';
import { countryCodes } from '@/shared/constants';
import { useFormat, useLocale } from '@/shared/hooks';

export interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  codes?: string[]; // limit the choice (e.g. countries the store works in)
}

// A country, named in the active language, sorted by name.
export const CountrySelect = ({ value, onChange, label, codes = countryCodes }: CountrySelectProps) => {
  const { text } = useLocale();
  const format = useFormat();
  return (
    <SelectField
      label={label ?? text.owner.fields.country}
      value={value}
      onChange={onChange}
      options={codes.map((code) => ({ value: code, label: format.country(code) })).sort((a, b) => a.label.localeCompare(b.label))}
    />
  );
};
