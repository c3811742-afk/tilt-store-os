import { useState } from 'react';
import { deleteRole, listRoles, saveRole } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, CheckboxGroup, Icon, IconButton, LocalizedField, Modal, Notice, PageHeader, Stack, Text } from '@/shared/components';
import { permissionGroups, routes, type Permission, type PermissionGroup } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import type { Localized, Role } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

interface Draft {
  id?: string;
  name: Localized;
  permissions: Permission[];
  owner: boolean;
}

// The roles people can have, and what each one can see and do. Owners always have every permission.
export const RolesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(listRoles, [version]);
  const action = useAction();
  const [draft, setDraft] = useState<Draft | null>(null);
  const t = text.owner.roles;
  const open = (role?: Role) => setDraft(role ? { id: role.id, name: role.name, permissions: role.permissions, owner: role.builtIn === 'owner' } : { name: { en: '', ar: '' }, permissions: [], owner: false });
  const groups = Object.keys(permissionGroups) as PermissionGroup[];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        back={{ to: routes.owner.staff, label: text.nav.staff }}
        actions={
          <Button onClick={() => open()}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state}>
        {(rows) => (
          <Stack gap={vars.spacing[3]}>
            {rows.map(({ role, members }) => (
              <Card
                key={role.id}
                title={format.text(role.name)}
                actions={
                  <>
                    {role.builtIn && <Badge>{t.builtIn}</Badge>}
                    <IconButton icon="pencil" label={text.common.edit} onClick={() => open(role)} />
                    {!role.builtIn && members === 0 && <IconButton icon="trash" label={text.common.delete} onClick={() => action.run(role.id, () => deleteRole(role.id))} />}
                  </>
                }
              >
                <Text variant="bodySm" color={vars.colors.textMuted}>
                  {fillText(t.summary, { members: format.number(members), permissions: format.number(role.permissions.length) })}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.edit : t.add}
        width={vars.sizes.container.maxWidth}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft || (!draft.name.en.trim() && !draft.name.ar.trim())) return;
          if (await action.run('save', () => saveRole({ id: draft.id, name: draft.name, permissions: draft.permissions }))) setDraft(null);
        }}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={Boolean(action.busy)}>
              {text.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <>
            <LocalizedField label={text.common.name} value={draft.name} onChange={(name) => setDraft({ ...draft, name })} required />
            {draft.owner && <Notice tone="info">{t.ownerAll}</Notice>}
            {!draft.owner &&
              groups.map((group) => (
                <CheckboxGroup
                  key={group}
                  label={t.groups[group]}
                  options={permissionGroups[group].map((permission) => ({ value: permission, label: t.permissions[permission] }))}
                  value={draft.permissions.filter((permission) => (permissionGroups[group] as readonly string[]).includes(permission))}
                  onChange={(selected) => setDraft({ ...draft, permissions: [...draft.permissions.filter((permission) => !(permissionGroups[group] as readonly string[]).includes(permission)), ...selected] })}
                />
              ))}
          </>
        )}
      </Modal>
    </Stack>
  );
};
