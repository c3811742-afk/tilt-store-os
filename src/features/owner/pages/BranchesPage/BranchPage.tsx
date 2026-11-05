import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getBranch, setBranchArchived } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Icon, Notice, PageHeader, Stack } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useLiveVersion, useLocale, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { BranchForm } from './BranchForm';

// Adds a branch (no id in the address) or edits one; an open branch can be archived when it closes.
export const BranchPage = () => {
  const { branchId } = useParams();
  const { text } = useLocale();
  const { settings } = useReference();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const action = useAction();
  const [saved, setSaved] = useState(false);
  const t = text.owner.branches;
  const state = useAsync(() => (branchId ? getBranch(branchId) : Promise.resolve(null)), [branchId, version], () => false);

  return (
    <AsyncContent state={state}>
      {(branch) => (
        <Stack gap={vars.spacing[5]}>
          <PageHeader
            back={{ to: routes.owner.branches, label: t.title }}
            title={branch ? branch.name : t.add}
            actions={
              branch && (
                <>
                  {branch.archived && <Badge>{text.common.archived}</Badge>}
                  <Button variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run('archive', () => setBranchArchived(branch.id, !branch.archived))}>
                    <Icon name={branch.archived ? 'restore' : 'archive'} />
                    {branch.archived ? text.common.restore : t.archive}
                  </Button>
                </>
              )
            }
          />
          {branch?.archived && <Notice tone="info">{t.archivedNotice}</Notice>}
          {saved && <Notice tone="success">{text.common.saved}</Notice>}
          {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
          <Card>
            <BranchForm
              key={branch?.id ?? 'new'}
              branchId={branch?.id}
              initial={
                branch
                  ? { name: branch.name, kind: branch.kind, countryCode: branch.countryCode, city: branch.city, address: branch.address, phone: branch.phone, currency: branch.currency, paymentMethodIds: branch.paymentMethodIds, locations: branch.locations }
                  : { name: '', kind: 'store', countryCode: 'EG', city: '', address: '', phone: '', currency: settings.baseCurrency, paymentMethodIds: settings.paymentMethods.filter((method) => method.active).map((method) => method.id), locations: [] }
              }
              onDone={(id) => {
                setSaved(true);
                if (!branch) navigate(toPath(routes.owner.branch, { branchId: id }));
              }}
            />
          </Card>
        </Stack>
      )}
    </AsyncContent>
  );
};
