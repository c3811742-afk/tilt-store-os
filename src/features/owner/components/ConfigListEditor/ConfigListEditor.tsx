import { useState } from 'react';
import { newOption, saveConfigList } from '@/shared/api';
import { Badge, Button, Card, Icon, IconButton, LocalizedField, Notice, Stack, Text } from '@/shared/components';
import { useAction, useErrorMessage, useLocale, useReference } from '@/shared/hooks';
import type { ConfigListKey, ConfigOption } from '@/shared/types';
import { vars } from '@/shared/theme';

export interface ConfigListEditorProps {
  listKey: ConfigListKey;
  title: string;
  hint?: string;
}

// Edits one of the lists staff choose from (reasons, categories). Options can be archived but not deleted,
// so past records keep their label.
export const ConfigListEditor = ({ listKey, title, hint }: ConfigListEditorProps) => {
  const { text } = useLocale();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const [draft, setDraft] = useState<ConfigOption[] | null>(null);
  const [saved, setSaved] = useState(false);
  const options = draft ?? settings.lists[listKey];
  const update = (index: number, patch: Partial<ConfigOption>) => {
    setSaved(false);
    setDraft(options.map((option, position) => (position === index ? { ...option, ...patch } : option)));
  };
  const invalid = options.some((option) => !option.label.en.trim() && !option.label.ar.trim());

  return (
    <Card
      title={title}
      actions={
        <Button
          size="sm"
          disabled={!draft || invalid || Boolean(action.busy)}
          onClick={async () => {
            if (draft && (await action.run('save', () => saveConfigList(listKey, draft)))) {
              setDraft(null);
              setSaved(true);
            }
          }}
        >
          {text.common.saveChanges}
        </Button>
      }
    >
      {hint && (
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {hint}
        </Text>
      )}
      {saved && <Notice tone="success">{text.common.saved}</Notice>}
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {options.map((option, index) => (
        <Stack key={option.id} direction="row" align="flex-end" gap={vars.spacing[2]}>
          <Stack grow>
            <LocalizedField label={text.common.name} value={option.label} onChange={(label) => update(index, { label })} />
          </Stack>
          {option.archived && <Badge>{text.common.archived}</Badge>}
          <IconButton icon={option.archived ? 'restore' : 'archive'} label={option.archived ? text.common.restore : text.common.archive} onClick={() => update(index, { archived: !option.archived })} />
        </Stack>
      ))}
      <Stack direction="row">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setSaved(false);
            setDraft([...options, newOption()]);
          }}
        >
          <Icon name="plus" />
          {text.common.add}
        </Button>
      </Stack>
    </Card>
  );
};
