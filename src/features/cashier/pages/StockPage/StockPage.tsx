import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { closeReservation, getItemStock, searchProducts } from '@/shared/api';
import { AsyncContent, Badge, Button, Card, Notice, PageHeader, SearchBox, Stack, Table, Text, OfflineStockNotice } from '@/shared/components';
import { routes, toPath } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { DefectModal, type DefectTarget } from '../../components/DefectModal';
import { ProductPhoto } from '../../components/ProductPhoto';
import { ReserveModal, type ReserveTarget } from '../../components/ReserveModal';
import styles from './StockPage.module.css';

// Stock from the counter (also on a phone): an item's sizes and colours on the floor and in the back room, the
// quantity in the other branches and online, and reserving, requesting or reporting a defect.
export const StockPage = () => {
  const { productId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const branchId = branch?.id ?? '';
  const t = text.cashier.stock;
  const [query, setQuery] = useState('');
  const hits = useAsync(() => searchProducts(query), [query]);
  const item = useAsync(() => (productId ? getItemStock(branchId, productId) : Promise.resolve(null)), [branchId, productId, version]);
  const [reserve, setReserve] = useState<ReserveTarget | null>(null);
  const [defect, setDefect] = useState<DefectTarget | null>(null);
  const [done, setDone] = useState('');
  const action = useAction();
  const hitList = hits.status === 'success' ? hits.data : [];

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <OfflineStockNotice />
      <SearchBox
        label={t.search}
        placeholder={t.search}
        value={query}
        onChange={setQuery}
        autoFocus={!productId}
        width="100%"
        emptyText={fillText(text.shell.noProducts, { query })}
        items={hitList.map((hit) => ({ key: hit.productId, label: hit.name, detail: hit.detail, image: hit.photo, imageName: hit.name }))}
        onSelect={(selected) => {
          setQuery('');
          navigate(toPath(routes.cashier.stockItem, { productId: selected.key }));
        }}
      />
      {done && <Notice tone="success">{done}</Notice>}
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      {!productId ? (
        <Notice>{t.pick}</Notice>
      ) : (
        <AsyncContent state={item}>
          {(stock) =>
            stock && (
              <Stack gap={vars.spacing[4]}>
                <Card>
                  <div className={styles.head}>
                    <span className={styles.photo}>
                      <ProductPhoto src={stock.photo} name={stock.name} />
                    </span>
                    <Stack gap={vars.spacing[1]}>
                      <Text as="h2" variant="h3" autoDirection>
                        {stock.name}
                      </Text>
                      <Text variant="bodySm" color={vars.colors.textMuted}>
                        {stock.brandName}
                      </Text>
                      {stock.price !== null && <Text variant="h4">{format.money(stock.price, stock.currency)}</Text>}
                    </Stack>
                  </div>
                </Card>
                <Card title={fillText(t.here, { branch: branch?.name ?? '' })}>
                  <Table
                    label={t.title}
                    stackOnMobile
                    columns={[
                      { key: 'variant', label: t.sizeColor },
                      { key: 'floor', label: t.floor, align: 'end' },
                      { key: 'back', label: t.backRoom, align: 'end' },
                      ...(stock.variants[0]?.elsewhere ?? []).map((other) => ({ key: other.branchId, label: other.name, align: 'end' as const })),
                      { key: 'actions', label: text.common.actions, align: 'end' },
                    ]}
                    rows={stock.variants.map((variant) => {
                      const label = `${stock.name} ${variant.size} ${variant.color}`;
                      const here = variant.floor + variant.backRoom;
                      return {
                        key: variant.variantId,
                        cells: {
                          variant: (
                            <Stack gap={vars.spacing[1]}>
                              <Text as="span" variant="bodySm">
                                {variant.size} · {variant.color}
                              </Text>
                              <Text as="span" variant="caption" color={vars.colors.textMuted}>
                                {variant.sku}
                              </Text>
                              {variant.reserved > 0 && (
                                <Text as="span" variant="caption" color={vars.colors.textSecondary}>
                                  {fillText(t.reservedCount, { count: format.number(variant.reserved) })}
                                </Text>
                              )}
                            </Stack>
                          ),
                          floor: format.number(variant.floor),
                          back: format.number(variant.backRoom),
                          ...Object.fromEntries(variant.elsewhere.map((other) => [other.branchId, format.number(other.qty)])),
                          actions: (
                            <span className={styles.actions}>
                              <Stack direction="row" gap={vars.spacing[1]} justify="flex-end">
                                <Button size="sm" variant="muted" disabled={!variant.elsewhere.some((other) => other.qty > 0)} onClick={() => setReserve({ mode: 'reserve', variantId: variant.variantId, label, branches: variant.elsewhere })}>
                                  {t.reserve}
                                </Button>
                                <Button size="sm" variant="muted" disabled={!variant.elsewhere.some((other) => other.qty > 0)} onClick={() => setReserve({ mode: 'request', variantId: variant.variantId, label, branches: variant.elsewhere })}>
                                  {t.request}
                                </Button>
                                <Button size="sm" variant="muted" disabled={here === 0} onClick={() => setDefect({ variantId: variant.variantId, label, max: here })}>
                                  {t.reportDefect}
                                </Button>
                              </Stack>
                            </span>
                          ),
                        },
                      };
                    })}
                  />
                  <Text variant="caption" color={vars.colors.textMuted}>
                    {t.otherBranches}: {t.quantityOnly}
                  </Text>
                </Card>
                <Card title={t.reservations}>
                  {stock.reservations.length ? (
                    <Table
                      label={t.reservations}
                      stackOnMobile
                      columns={[
                        { key: 'number', label: text.cashier.receipt.number },
                        { key: 'item', label: t.sizeColor },
                        { key: 'where', label: text.cashier.reserve.from },
                        { key: 'customer', label: text.cashier.cart.customer },
                        { key: 'status', label: text.common.status },
                        { key: 'actions', label: text.common.actions, align: 'end' },
                      ]}
                      rows={stock.reservations.map((reservation) => ({
                        key: reservation.id,
                        cells: {
                          number: reservation.number,
                          item: `${reservation.size} · ${reservation.color} × ${format.number(reservation.qty)}`,
                          where: reservation.branchName,
                          customer: `${reservation.customer.name} · ${reservation.customer.phone}`,
                          status: (
                            <Stack gap={vars.spacing[1]} align="flex-start">
                              <Badge variant={reservation.status === 'active' ? 'info' : 'neutral'}>{t.statuses[reservation.status]}</Badge>
                              {reservation.status === 'active' && (
                                <Text as="span" variant="caption" color={vars.colors.textMuted}>
                                  {fillText(t.until, { time: format.dateTime(reservation.expiresAt) })}
                                </Text>
                              )}
                            </Stack>
                          ),
                          actions:
                            reservation.status === 'active' ? (
                              <Stack direction="row" wrap gap={vars.spacing[1]} justify="flex-end">
                                <Button size="sm" variant="muted" disabled={Boolean(action.busy)} onClick={() => action.run(reservation.id, () => closeReservation(reservation.id, true))}>
                                  {t.collected}
                                </Button>
                                <Button size="sm" variant="muted" disabled={Boolean(action.busy)} onClick={() => action.run(`r-${reservation.id}`, () => closeReservation(reservation.id, false))}>
                                  {t.release}
                                </Button>
                              </Stack>
                            ) : null,
                        },
                      }))}
                    />
                  ) : (
                    <Text variant="bodySm" color={vars.colors.textMuted}>
                      {t.noReservations}
                    </Text>
                  )}
                </Card>
              </Stack>
            )
          }
        </AsyncContent>
      )}
      {reserve && <ReserveModal key={`${reserve.mode}-${reserve.variantId}`} target={reserve} onClose={() => setReserve(null)} onDone={setDone} />}
      {defect && <DefectModal key={defect.variantId} target={defect} onClose={() => setDefect(null)} onDone={() => setDone(text.cashier.defect.reported)} />}
    </Stack>
  );
};
