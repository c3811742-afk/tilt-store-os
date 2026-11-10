import { decideStockRequest, listStockRequests, type StockFilter } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, Stack, Table, Text } from '@/shared/components';
import { requestStatusTone } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { isFiltered } from './isFiltered';

// New stock requests from branch managers: send to the warehouse, order from the brand, or reject.
export const RequestsTab = ({ filter }: { filter: StockFilter }) => {
  const { text } = useLocale();
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const state = useAsync(() => listStockRequests(filter), [JSON.stringify(filter), version]);
  const action = useAction();
  const t = text.owner.stock;
  return (
    <Stack gap={vars.spacing[4]}>
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{isFiltered(filter) ? text.common.noResults : t.noRequests}</Notice>}>
        {(rows) => (
          <Stack gap={vars.spacing[3]}>
            {rows.map(({ request, lines }) => (
              <Card
                key={request.id}
                title={`${request.number} · ${format.branch(request.branchId)}`}
                actions={
                  request.status === 'pending' ? (
                    <>
                      <Button size="sm" disabled={Boolean(action.busy)} onClick={() => action.run(request.id, () => decideStockRequest(request.id, 'warehouse'))}>
                        {t.sendToWarehouse}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(request.id, () => decideStockRequest(request.id, 'brand'))}>
                        {t.orderFromBrand}
                      </Button>
                      <Button size="sm" variant="muted" disabled={Boolean(action.busy)} onClick={() => action.run(request.id, () => decideStockRequest(request.id, 'reject'))}>
                        {text.common.reject}
                      </Button>
                    </>
                  ) : (
                    <Badge variant={requestStatusTone[request.status]}>{t.requestStates[request.status]}</Badge>
                  )
                }
              >
                <Text variant="caption" color={vars.colors.textMuted}>
                  {`${format.user(request.requestedById)} · ${format.dateTime(request.at)}`}
                </Text>
                <Table paged filterable={false}
                  label={request.number}
                  columns={[
                    { key: 'item', label: text.owner.fields.product },
                    { key: 'qty', label: t.pieces, align: 'end' },
                  ]}
                  rows={lines.map((line) => ({ key: line.variantId, cells: { item: `${line.productName} · ${format.brand(line.brandId)} · ${line.size} · ${line.color}`, qty: format.number(line.qty) } }))}
                />
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
