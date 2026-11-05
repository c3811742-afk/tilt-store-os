import { useLocale } from '@/shared/hooks';
import { withDefaults } from '@/shared/utils';
import { TextField } from '../TextField';
import { localizedFieldDefaults } from './LocalizedField.defaults';
import type { LocalizedFieldProps } from './LocalizedField.types';
import styles from './LocalizedField.module.css';

// One name in both languages (a reason, a category): an English and an Arabic box side by side.
export const LocalizedField = (props: LocalizedFieldProps) => {
  const { label, value, onChange, error, required } = withDefaults(localizedFieldDefaults, props);
  const { text } = useLocale();
  return (
    <div className={styles.row}>
      <TextField
        label={`${label ?? ''} (${text.common.languages.en})`}
        value={value.en}
        onChange={(en) => onChange?.({ ...value, en })}
        error={error}
        required={required}
      />
      <TextField
        label={`${label ?? ''} (${text.common.languages.ar})`}
        value={value.ar}
        onChange={(ar) => onChange?.({ ...value, ar })}
        required={required}
      />
    </div>
  );
};
