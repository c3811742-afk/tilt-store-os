import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { createStaff, getStaffMember, resetApprovalPin, resetStaffPassword, setApprovalPinLocked, setStaffActive, setStaffPin, updateStaff, type StaffInput } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, CheckboxGroup, DetailList, Grid, Notice, PageHeader, Stack, Text, TextField } from '@/shared/components';
import { routes, toPath, userStatusTone } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useForm, useFormat, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { BrandSelect } from '../../components';
import { validators } from '../../utils';

// Adds a person (which creates their account) or edits one: roles, branches, PIN, password and access.
export const StaffMemberPage = () => {
  const { userId } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { roles, branches } = useReference();
  const errorMessage = useErrorMessage();
  const check = validators(text);
  const version = useLiveVersion();
  const action = useAction();
  const state = useAsync(() => (userId ? getStaffMember(userId) : Promise.resolve(null)), [userId, version], () => false);
  const [handover, setHandover] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const t = text.owner.staff;
  const ownerRole = roles.find((role) => role.builtIn === 'owner');
  const brandRole = roles.find((role) => role.builtIn === 'brandPartner');
  const managerRole = roles.find((role) => role.builtIn === 'manager');

  return (
    <AsyncContent state={state}>
      {(member) => (
        <StaffForm
          key={member?.id ?? 'new'}
          initial={member ? { name: member.name, phone: member.phone, email: member.email, roleIds: member.roleIds, branchIds: member.branchIds, brandId: member.brandId } : { name: '', phone: '', email: '', roleIds: [], branchIds: [] }}
          header={
            <PageHeader
              back={{ to: routes.owner.staff, label: t.title }}
              title={member ? member.name : t.add}
              actions={member && <Badge variant={userStatusTone[member.status]}>{t.statuses[member.status]}</Badge>}
            />
          }
          notices={
            <>
              {handover && <Notice tone="success" title={t.handoverTitle}>{handover}</Notice>}
              {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
            </>
          }
          onSubmit={async (input) => {
            if (member) {
              await updateStaff(member.id, input);
              setHandover(text.common.saved);
              return;
            }
            const created = await createStaff(input);
            setHandover(
              created.inviteCode
                ? fillText(t.inviteSent, { name: created.member.name, email: created.member.email, code: created.inviteCode })
                : fillText(t.temporaryPassword, { username: created.username, password: created.temporaryPassword ?? '' }),
            );
            navigate(toPath(routes.owner.staffMember, { userId: created.member.id }), { replace: true });
          }}
          submitLabel={member ? text.common.saveChanges : t.add}
          renderFields={(form) => {
            const isOwner = ownerRole ? form.values.roleIds.includes(ownerRole.id) : false;
            const isBrand = brandRole ? form.values.roleIds.includes(brandRole.id) : false;
            return (
              <>
                <Grid>
                  <TextField label={text.common.name} required {...form.field('name')} />
                  <TextField label={text.owner.fields.phone} type="tel" required {...form.field('phone')} />
                  <TextField label={text.owner.fields.email} type="email" {...form.field('email')} />
                </Grid>
                <CheckboxGroup label={t.roles} hint={t.rolesHint} options={roles.map((role) => ({ value: role.id, label: format.text(role.name) }))} value={form.values.roleIds} onChange={(roleIds) => form.setValue('roleIds', roleIds)} error={form.errors.roleIds} />
                {isOwner && <Notice tone="info">{t.ownerNote}</Notice>}
                {isBrand && <BrandSelect label={t.brandPartnerBrand} allLabel="" value={form.values.brandId ?? ''} onChange={(brandId) => form.setValue('brandId', brandId)} />}
                {!isOwner && !isBrand && (
                  <CheckboxGroup label={t.branches} hint={t.branchesHint} options={branches.filter((branch) => !branch.archived).map((branch) => ({ value: branch.id, label: branch.name }))} value={form.values.branchIds} onChange={(branchIds) => form.setValue('branchIds', branchIds)} />
                )}
              </>
            );
          }}
          validators={{ name: check.required, phone: check.required, email: check.email, roleIds: (value) => (value.length ? null : text.validation.required) }}
          extra={
            member && (
              <Stack gap={vars.spacing[4]}>
                <Card title={t.access}>
                  <DetailList
                    items={[
                      { key: 'username', label: t.username, value: member.username },
                      { key: 'password', label: t.password, value: member.mustChangePassword ? t.mustChange : t.passwordSet },
                      { key: 'pin', label: t.pin, value: member.hasPin ? t.pinSet : text.common.notSet },
                      { key: 'created', label: t.created, value: `${format.date(member.createdAt)}${member.createdById ? ` · ${format.user(member.createdById)}` : ''}` },
                    ]}
                  />
                  <Stack direction="row" wrap gap={vars.spacing[2]} align="flex-end">
                    <Button
                      variant="secondary"
                      disabled={Boolean(action.busy)}
                      onClick={async () => {
                        const password = await action.run('password', () => resetStaffPassword(member.id));
                        if (password) setHandover(fillText(t.temporaryPassword, { username: member.username, password }));
                      }}
                    >
                      {t.resetPassword}
                    </Button>
                    <TextField label={t.newPin} inputMode="numeric" maxLength={4} value={pin} onChange={setPin} width={vars.sizes.field.narrow} error={pin && check.pin(pin) ? check.pin(pin) ?? undefined : undefined} />
                    <Button
                      variant="secondary"
                      disabled={Boolean(action.busy) || Boolean(check.pin(pin))}
                      onClick={async () => {
                        if (await action.run('pin', () => setStaffPin(member.id, pin))) {
                          setPin('');
                          setHandover(t.pinSaved);
                        }
                      }}
                    >
                      {t.setPin}
                    </Button>
                  </Stack>
                </Card>
                {managerRole && member.roleIds.includes(managerRole.id) && (
                  <Card title={t.approvalPin}>
                    <Text variant="bodySm" color={vars.colors.textMuted}>
                      {member.approvalPinLocked ? t.approvalPinLocked : member.hasApprovalPin ? t.approvalPinSet : t.approvalPinMissing}
                    </Text>
                    <Stack direction="row" wrap gap={vars.spacing[2]}>
                      <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('approvalReset', () => resetApprovalPin(member.id))}>
                        {t.resetApprovalPin}
                      </Button>
                      <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('approvalLock', () => setApprovalPinLocked(member.id, !member.approvalPinLocked))}>
                        {member.approvalPinLocked ? t.unlockApprovalPin : t.lockApprovalPin}
                      </Button>
                    </Stack>
                  </Card>
                )}
                <Card title={member.status === 'inactive' ? t.reactivate : t.deactivate}>
                  <Text variant="bodySm" color={vars.colors.textMuted}>
                    {member.status === 'inactive' ? t.reactivateHint : t.deactivateHint}
                  </Text>
                  <Stack direction="row">
                    <Button variant={member.status === 'inactive' ? 'primary' : 'danger'} disabled={Boolean(action.busy)} onClick={() => action.run('active', () => setStaffActive(member.id, member.status === 'inactive'))}>
                      {member.status === 'inactive' ? t.reactivate : t.deactivate}
                    </Button>
                  </Stack>
                </Card>
              </Stack>
            )
          }
        />
      )}
    </AsyncContent>
  );
};

type StaffForm = ReturnType<typeof useForm<StaffInput>>;

interface StaffFormProps {
  initial: StaffInput;
  header: ReactNode;
  notices: ReactNode;
  extra?: ReactNode;
  submitLabel: string;
  validators: Parameters<typeof useForm<StaffInput>>[1];
  renderFields: (form: StaffForm) => ReactNode;
  onSubmit: (input: StaffInput) => Promise<void>;
}

const StaffForm = ({ initial, header, notices, extra, submitLabel, validators: checks, renderFields, onSubmit }: StaffFormProps) => {
  const errorMessage = useErrorMessage();
  const form = useForm(initial, checks);
  return (
    <Stack gap={vars.spacing[5]}>
      {header}
      {notices}
      {Boolean(form.requestError) && <Notice tone="danger">{errorMessage(form.requestError)}</Notice>}
      <Card>
        <Stack as="form" gap={vars.spacing[4]} onSubmit={form.submit(onSubmit)}>
          {renderFields(form)}
          <Stack direction="row" justify="flex-end">
            <Button type="submit" disabled={form.submitting}>
              {submitLabel}
            </Button>
          </Stack>
        </Stack>
      </Card>
      {extra}
    </Stack>
  );
};
