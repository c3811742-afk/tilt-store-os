import { useState } from 'react';
import { useNavigate } from 'react-router';
import { rolesWithScreens, setMyPhoto } from '@/shared/api';
import { Button, Card, DetailList, FileField, Grid, Notice, PageHeader, Stack, Text, Thumbnail } from '@/shared/components';
import { routes, withQuery } from '@/shared/constants';
import { useAction, useErrorMessage, useLocale, useReference, useSession } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { localized } from '@/shared/utils';
import { PasswordForm } from './PasswordForm';

// The signed-in person's own page: photo (the name is set by the owner), password and alerts.
export const AccountPage = () => {
  const { text, locale } = useLocale();
  const { session, setSession } = useSession();
  const { roles, branches } = useReference();
  const errorMessage = useErrorMessage();
  const action = useAction();
  const navigate = useNavigate();
  const [changed, setChanged] = useState(false);
  const t = text.account;
  if (!session) return null;
  const { user } = session;

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
              { key: 'name', label: t.name, value: <Stack gap={vars.spacing[1]}><Text as="span" autoDirection>{user.name}</Text><Text as="span" variant="caption" color={vars.colors.textMuted}>{t.nameHint}</Text></Stack> },
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
