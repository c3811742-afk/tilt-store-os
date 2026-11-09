import { useState } from 'react';
import { useNavigate } from 'react-router';
import { rolesWithScreens, setMyName, setMyPhoto } from '@/shared/api';
import { Button, Card, DetailList, FileField, Grid, Notice, PageHeader, Stack, Text, TextField, Thumbnail } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAction, useErrorMessage, useLocale, useReference, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { localized } from '@/shared/utils';
import { PasswordForm } from './PasswordForm';

// The signed-in person's own page: photo, password and alerts. The owner also changes their own name here; staff
// names are set by the owner (on Staff), so staff see theirs with a note saying so.
export const AccountPage = () => {
  const { text, locale } = useLocale();
  const { session, setSession } = useSession();
  const { roles, branches } = useReference();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const navigate = useNavigate();
  const [changed, setChanged] = useState(false);
  const [name, setName] = useState<string | null>(null); // the owner's name while it is being changed
  const t = text.account;
  if (!session) return null;
  const { user } = session;

  const saveName = async () => {
    const next = await action.run('name', () => setMyName(name ?? ''));
    if (next) {
      setSession(next);
      setName(null);
    }
  };

  const savePhoto = async (photo: string | undefined) => {
    const next = await action.run('photo', () => setMyPhoto(photo));
    if (next) setSession(next);
  };

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      {!session.roles.some((role) => rolesWithScreens.includes(role)) && <Notice>{text.access.noScreens}</Notice>}
      <Grid minColumnWidth={vars.sizes.card.minWidth}>
        <Card title={t.profile}>
          <Stack direction="row" gap={vars.spacing[4]} align="center" wrap>
            <Thumbnail name={user.name} src={user.photo} round size={vars.sizes.avatar.lg} />
            <Stack gap={vars.spacing[2]} grow>
              <FileField label={t.photo} accept="image/*" hint={t.photoHint} value={null} onChange={(file) => file && void savePhoto(file.dataUrl)} />
              {user.photo && (
                <div>
                  <Button variant="muted" size="sm" disabled={Boolean(action.busy)} onClick={() => void savePhoto(undefined)}>
                    {t.removePhoto}
                  </Button>
                </div>
              )}
            </Stack>
          </Stack>
          {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
          <DetailList
            items={[
              {
                key: 'name',
                label: t.name,
                value: session.isOwner ? (
                  <Stack direction="row" gap={vars.spacing[2]} align="flex-start" wrap>
                    <TextField label="" value={name ?? user.name} onChange={setName} error={name !== null && !name.trim() ? text.validation.required : undefined} width={vars.sizes.field.maxWidth} />
                    {name !== null && name.trim() !== user.name && (
                      <Button disabled={!name.trim() || Boolean(action.busy)} onClick={() => void saveName()}>
                        {text.common.save}
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Stack gap={vars.spacing[1]}>
                    <Text as="span" autoDirection>{user.name}</Text>
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>{t.nameHint}</Text>
                  </Stack>
                ),
              },
              { key: 'username', label: t.username, value: user.username },
              { key: 'email', label: t.email, value: user.email },
              { key: 'role', label: t.role, value: roles.filter((role) => user.roleIds.includes(role.id)).map((role) => localized(role.name, locale)).join(text.common.listSeparator) },
              ...(user.branchIds.length ? [{ key: 'branches', label: t.branches, value: branches.filter((branch) => user.branchIds.includes(branch.id)).map((branch) => branch.name).join(text.common.listSeparator) }] : []),
            ]}
          />
        </Card>
        <Stack gap={vars.spacing[4]}>
          <Card title={t.password}>
            <PasswordForm currentLabel={t.currentPassword} done={changed} onChanged={(next) => { setSession(next); setChanged(true); }} />
          </Card>
          <Card title={t.manageAlerts}>
            <div>
              <Button variant="secondary" onClick={() => navigate(withQuery(routes.notifications, { settings: '1' }))}>
                {t.chooseAlerts}
              </Button>
            </div>
          </Card>
        </Stack>
      </Grid>
    </Stack>
  );
};
