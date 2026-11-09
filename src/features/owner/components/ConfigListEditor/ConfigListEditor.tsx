import { useState } from 'react';
import { newOption, saveConfigList } from '@/shared/api';
import { Badge, Button, Card, Icon, IconButton, LocalizedField, Modal, Notice, Stack } from '@/shared/components';
import { useAction, useErrorMessage, useLocale, useReference } from '@/shared/hooks';
import type { ConfigListKey, ConfigOption } from '@/shared/types';
import { vars } from '@/shared/theme';

export interface ConfigListEditorProps {
  listKey: ConfigListKey;
  title: string;
  hint?: string;
}

// The editing shared by the card and the window: a draft of the list, changed in place and saved at once.
const useConfigListDraft = (listKey: ConfigListKey) => {
  const { settings } = useReference();
  const action = useAction();
  const [draft, setDraft] = useState<ConfigOption[] | null>(null);
  const options = draft ?? settings.lists[listKey];
  return {
    options,
    action,
    changed: Boolean(draft),
    invalid: options.some((option) => !option.label.en.trim() && !option.label.ar.trim()),
    update: (index: number, patch: Partial<ConfigOption>) => setDraft(options.map((option, position) => (position === index ? { ...option, ...patch } : option))),
    add: () => setDraft([...options, newOption()]),
    save: async () => {
      if (!draft) return true;
      const ok = await action.run('save', () => saveConfigList(listKey, draft));
      if (ok) setDraft(null);
      return Boolean(ok);
    },
  };
};

// The options themselves: a name in each language, archive or restore, and Add.
const ConfigListFields = ({ list }: { list: ReturnType<typeof useConfigListDraft> }) => {
  const { text } = useLocale();
  return (
    <>
      {list.options.map((option, index) => (
        <Stack key={option.id} direction="row" align="flex-end" gap={vars.spacing[2]}>
          <Stack grow>
            <LocalizedField label={text.common.name} value={option.label} onChange={(label) => list.update(index, { label })} />
          </Stack>
          {option.archived && <Badge>{text.common.archived}</Badge>}
          <IconButton icon={option.archived ? 'restore' : 'archive'} label={option.archived ? text.common.restore : text.common.archive} onClick={() => list.update(index, { archived: !option.archived })} />
        </Stack>
      ))}
      <Stack direction="row">
        <Button variant="secondary" size="sm" onClick={list.add}>
          <Icon name="plus" />
          {text.common.add}
        </Button>
      </Stack>
    </>
  );
};

// Edits one of the lists staff choose from (reasons, categories), as a card on a settings page. Options can be
// archived but not deleted, so past records keep their label.
export const ConfigListEditor = ({ listKey, title, hint }: ConfigListEditorProps) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const list = useConfigListDraft(listKey);
  const [saved, setSaved] = useState(false);

  return (
    <Card
      title={title}
      info={hint}
      actions={
        <Button
          size="sm"
          disabled={!list.changed || list.invalid || Boolean(list.action.busy)}
          onClick={async () => {
            if (await list.save()) setSaved(true);
          }}
        >
          {text.common.saveChanges}
        </Button>
      }
    >
      {saved && !list.changed && <Notice tone="success">{text.common.saved}</Notice>}
      {Boolean(list.action.error) && <Notice tone="danger">{errorMessage(list.action.error)}</Notice>}
      <ConfigListFields list={list} />
    </Card>
  );
};

// The same list in a window, opened from a button on the page that uses it (e.g. Manage categories on Expenses).
export const ConfigListModal = ({ listKey, title, hint, onClose }: ConfigListEditorProps & { onClose: () => void }) => {
  const { text } = useLocale();
  const errorMessage = useErrorMessage();
  const list = useConfigListDraft(listKey);

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      info={hint}
      onSubmit={(event) => {
        event.preventDefault();
        void list.save().then((ok) => ok && onClose());
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={list.invalid || Boolean(list.action.busy)}>
            {text.common.saveChanges}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[3]}>
        {Boolean(list.action.error) && <Notice tone="danger">{errorMessage(list.action.error)}</Notice>}
        <ConfigListFields list={list} />
      </Stack>
    </Modal>
  );
};
