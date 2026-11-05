import { useId, useRef } from 'react';
import { useLocale } from '@/shared/hooks';
import { formatFileSize, readFileAsDataUrl, safeAsync, withDefaults } from '@/shared/utils';
import { Button } from '../Button';
import { Field } from '../Field';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { fileFieldDefaults } from './FileField.defaults';
import type { FileFieldProps } from './FileField.types';
import styles from './FileField.module.css';

// Picks one file (a signed agreement, a receipt, a logo) and keeps its name and content.
export const FileField = (props: FileFieldProps) => {
  const { label, accept, value, onChange, hint, error, width } = withDefaults(fileFieldDefaults, props);
  const { text, locale } = useLocale();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const result = await safeAsync(() => readFileAsDataUrl(file));
    if (result.ok) onChange?.({ name: file.name, size: file.size, dataUrl: result.data });
  };

  return (
    <Field id={id} label={label} hint={hint} error={error} width={width}>
      <div className={styles.row}>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className={styles.input}
          onChange={(event) => {
            void pick(event.target.files?.[0]);
            event.target.value = ''; // so picking the same file again still fires
          }}
        />
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" />
          {value ? text.common.replaceFile : text.common.chooseFile}
        </Button>
        {value && (
          <>
            <span className={styles.name}>
              {value.name} ({formatFileSize(value.size, locale)})
            </span>
            <IconButton icon="close" label={text.common.remove} onClick={() => onChange?.(null)} />
          </>
        )}
      </div>
    </Field>
  );
};
