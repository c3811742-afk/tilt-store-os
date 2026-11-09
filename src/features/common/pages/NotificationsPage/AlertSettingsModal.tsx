import { useState } from 'react';
import { setMyMutedAlerts, setOwnerAlerts } from '@/shared/api';
import { Button, Checkbox, Modal, Notice, Stack, Text } from '@/shared/components';
import { alertsByRole } from '@/shared/constants';
import { useAction, useErrorMessage, useLocale, useReference, useSession } from '@/shared/hooks';
import type { AlertKind } from '@/shared/types';
import { vars } from '@/shared/theme';

// Which alerts are received: owners choose for all owners at once, everyone else for themselves. Opened from the
// Notification settings button on the notifications page (and from My account).
export const AlertSettingsModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { text } = useLocale();
  const { settings } = useReference();
  const errorMessage = useErrorMessage();
  const { session, setSession } = useSession();
  const action = useAction();
  const t = text.owner.notifications;
  const isOwner = Boolean(session?.isOwner);
  const [ownerAlerts, setOwnerChoice] = useState<Record<AlertKind, boolean>>(settings.ownerAlerts);
  const [muted, setMuted] = useState<AlertKind[]>(session?.user.mutedAlerts ?? []);
  const myKinds = [...new Set((session?.roles ?? []).flatMap((role) => alertsByRole[role] ?? []))];
  const kinds = isOwner ? (Object.keys(ownerAlerts) as AlertKind[]) : myKinds;
  const isOn = (kind: AlertKind) => (isOwner ? ownerAlerts[kind] : !muted.includes(kind));
  const toggle = (kind: AlertKind, checked: boolean) =>
    isOwner ? setOwnerChoice({ ...ownerAlerts, [kind]: checked }) : setMuted(checked ? muted.filter((current) => current !== kind) : [...muted, kind]);

  const save = async () => {
    if (isOwner) {
      if (await action.run('save', () => setOwnerAlerts(ownerAlerts))) onClose();
      return;
    }
    const next = await action.run('save', () => setMyMutedAlerts(muted));
    if (next) {
      setSession(next);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.settingsTitle}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            {text.common.cancel}
          </Button>
          <Button type="submit" disabled={Boolean(action.busy)}>
            {text.common.saveChanges}
          </Button>
        </>
      }
    >
      <Stack gap={vars.spacing[3]}>
        <Text variant="bodySm" color={vars.colors.textMuted}>
          {isOwner ? t.settingsHint : text.account.alertsHint}
        </Text>
        {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
        {kinds.map((kind) => (
          <Checkbox key={kind} label={t.kinds[kind]} checked={isOn(kind)} onChange={(checked) => toggle(kind, checked)} />
        ))}
      </Stack>
    </Modal>
  );
};
