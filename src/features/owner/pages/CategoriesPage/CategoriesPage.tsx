import { useState } from 'react';
import { Link } from 'react-router';
import { listCategories, saveCategory, setCategoryArchived } from '@/shared/api';
import { AsyncContent, Badge, Button, Checkbox, Icon, IconButton, LocalizedField, Modal, Notice, PageHeader, Stack, Table, TextField, recordRows } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { Category, Localized } from '@/shared/types';
import { vars } from '@/shared/theme';

interface Draft {
  id?: string;
  name: Localized;
  minMargin: string;
}

// Product categories: add, rename, set a minimum margin, archive (products keep their category).
export const CategoriesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(listCategories, [version]);
  const action = useAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const t = text.owner.categories;

  const open = (category?: Category) => setDraft(category ? { id: category.id, name: category.name, minMargin: category.minMargin === null ? '' : String(category.minMargin) } : { name: { en: '', ar: '' }, minMargin: '' });
  const nameMissing = draft !== null && !draft.name.en.trim() && !draft.name.ar.trim();

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        back={{ to: routes.owner.products, label: text.owner.products.title }}
        actions={
          <Button onClick={() => open()}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Checkbox label={text.common.showArchived} checked={showArchived} onChange={setShowArchived} />
      <AsyncContent state={state}>
        {(rows) => (
          <Table
            label={t.title}
            columns={[
              { key: 'name', label: text.common.name },
              { key: 'products', label: text.owner.products.title, align: 'end' },
              { key: 'margin', label: t.minMargin, align: 'end' },
              { key: 'actions', label: text.common.actions, align: 'end' },
            ]}
            rows={recordRows(
              rows.filter((row) => showArchived || !row.category.archived),
              (row) => row.category.id,
              [
                {
                  key: 'name',
                  label: '',
                  render: (row) => (
                    <Stack direction="row" gap={vars.spacing[2]} align="center">
                      {format.text(row.category.name)}
                      {row.category.archived && <Badge>{text.common.archived}</Badge>}
                    </Stack>
                  ),
                },
                { key: 'products', label: '', render: (row) => <Link to={withQuery(routes.owner.products, { category: row.category.id })}>{format.number(row.productCount)}</Link> },
                { key: 'margin', label: '', render: (row) => (row.category.minMargin === null ? t.defaultMargin : format.percent(row.category.minMargin)) },
                {
                  key: 'actions',
                  label: '',
                  render: (row) => (
                    <Stack direction="row" gap={vars.spacing[1]} justify="flex-end">
                      <IconButton icon="pencil" label={text.common.edit} onClick={() => open(row.category)} />
                      <IconButton
                        icon={row.category.archived ? 'restore' : 'archive'}
                        label={row.category.archived ? text.common.restore : text.common.archive}
                        onClick={() => action.run(row.category.id, () => setCategoryArchived(row.category.id, !row.category.archived))}
                      />
                    </Stack>
                  ),
                },
              ],
            )}
          />
        )}
      </AsyncContent>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.edit : t.add}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft || nameMissing) return;
          const done = await action.run('save', () => saveCategory({ id: draft.id, name: draft.name, minMargin: draft.minMargin.trim() === '' ? null : Number(draft.minMargin) }));
          if (done) setDraft(null);
        }}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={nameMissing || Boolean(action.busy)}>
              {text.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <>
            <LocalizedField label={text.common.name} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} error={nameMissing ? text.validation.required : undefined} required />
            <TextField label={t.minMargin} hint={t.minMarginHint} type="number" min={0} max={100} suffix={text.common.percentSuffix} value={draft.minMargin} onChange={(minMargin) => setDraft({ ...draft, minMargin })} />
          </>
        )}
      </Modal>
    </Stack>
  );
};
