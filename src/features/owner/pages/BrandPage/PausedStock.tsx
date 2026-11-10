import { collectPausedBrandStock, getPausedBrandStock, returnPausedBrandStock } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, Stack, Table } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';

// A paused brand's stock on its way out: first from every branch to the warehouse, then from the warehouse back to
// the brand, each with one button (the owner is reminded daily until it's done).
export const PausedStock = ({ brandId }: { brandId: string }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => getPausedBrandStock(brandId), [brandId, version]);
  const action = useAction();
  const t = text.owner.brands.pausedStock;
  const pieces = (count: number) => ({ pieces: format.number(count) });

  return (
    <AsyncContent state={state}>
      {(stock) =>
        stock.step !== 'done' && (
          <Card title={t.title}>
            <Stack gap={vars.spacing[3]}>
              {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
              {stock.step === 'collect' && (
                <>
                  <Notice
                    tone="warning"
                    action={
                      <Button size="sm" disabled={Boolean(action.busy) || stock.branches.every((row) => row.transferPending)} onClick={() => action.run('collect', () => collectPausedBrandStock(brandId))}>
                        {t.transfer}
                      </Button>
                    }
                  >
                    {fillText(t.collect, pieces(stock.inBranches))}
                  </Notice>
                  <Table
                    label={t.title}
                    columns={[
                      { key: 'branch', label: text.owner.fields.branch },
                      { key: 'pieces', label: text.owner.stock.pieces, align: 'end' },
                      { key: 'transfer', label: text.common.status },
                    ]}
                    rows={stock.branches.map((row) => ({
                      key: row.branchId,
                      cells: {
                        branch: format.branch(row.branchId),
                        pieces: format.number(row.pieces),
                        transfer: row.transferPending ? <Badge variant="info">{t.transferWaiting}</Badge> : '',
                      },
                    }))}
                  />
                </>
              )}
              {stock.step === 'onTheWay' && <Notice tone="info">{fillText(t.onTheWay, pieces(stock.inTransit))}</Notice>}
              {stock.step === 'return' && (
                <Notice
                  tone="warning"
                  action={
                    <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run('return', () => returnPausedBrandStock(brandId))}>
                      {t.returnToBrand}
                    </Button>
                  }
                >
                  {fillText(t.atWarehouse, pieces(stock.atWarehouse))}
                </Notice>
              )}
            </Stack>
          </Card>
        )
      }
    </AsyncContent>
  );
};
