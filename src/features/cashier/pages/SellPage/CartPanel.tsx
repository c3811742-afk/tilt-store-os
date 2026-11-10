import { useState } from 'react';
import { useNavigate } from 'react-router';
import { findCustomers, type ApprovalNeed, type CustomerView, type Quote } from '@/shared/api';
import { Button, IconButton, Notice, SearchBox, Stack, Text, TextField } from '@/shared/components';
import { routes, toPath, tillDefaults } from '@/shared/constants';
import { useAsync, useFormat, useLocale, useBranchScope, useTopOffset } from '@/shared/hooks';
import type { ManualDiscount } from '@/shared/types';
import { vars } from '@/shared/theme';
import { fillText, phoneDigits } from '@/shared/utils';
import { ProductPhoto } from '../../components/ProductPhoto';
import { QtyStepper } from '../../components/QtyStepper';
import { useCart } from '../../hooks/useCart';
import styles from '../../components/counter.module.css';

export interface MissingItem {
  label: string;
  variantId: string;
  elsewhere: { branchId: string; name: string; qty: number }[];
}

interface CartPanelProps {
  quote: Quote | null; // null while the first price loads
  stockOf: (variantId: string) => number; // pieces available in this branch
  missing: MissingItem | null;
  onReserve: (mode: 'reserve' | 'request') => void;
  onDiscount: (variantId: string | null) => void; // null: the whole sale
  onApproval: (need: ApprovalNeed) => void;
  onPay: (methodId?: string) => void;
  onHold: () => void;
  onCancel: () => void;
  onCustomerFound: (customer: CustomerView | null) => void;
  customer: CustomerView | null;
  tried: boolean; // Pay was pressed: show what is missing
}

// The current sale, as on the mood board: lines, the "not in this branch" notice, the customer, totals and payment.
export const CartPanel = ({ quote, stockOf, missing, onReserve, onDiscount, onApproval, onPay, onHold, onCancel, onCustomerFound, customer, tried }: CartPanelProps) => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const { branch } = useBranchScope();
  const { cart, setCart } = useCart();
  const t = text.cashier.cart;
  const [code, setCode] = useState(cart.promoCode);
  const phoneQuery = cart.customer.phone;
  const matches = useAsync(() => findCustomers(customer ? '' : phoneQuery), [phoneQuery, customer?.id]);
  const currency = quote?.currency ?? branch?.currency ?? '';
  const empty = cart.items.length === 0;
  const discountOf = (variantId: string) => cart.items.find((item) => item.variantId === variantId)?.discount;
  const describe = (discount: ManualDiscount) => (discount.type === 'percent' ? format.percent(discount.value, 1) : format.money(discount.value, currency));
  const setQty = (variantId: string, qty: number) => setCart((current) => ({ ...current, items: current.items.map((item) => (item.variantId === variantId ? { ...item, qty } : item)) }));
  const remove = (variantId: string) => setCart((current) => ({ ...current, items: current.items.filter((item) => item.variantId !== variantId) }));
  const setCustomer = (field: 'name' | 'phone' | 'age', value: string) => {
    if (field === 'phone' && customer) onCustomerFound(null);
    setCart((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
  };
  const nameMissing = tried && !cart.customer.name.trim();
  const phoneMissing = tried && phoneDigits(cart.customer.phone).length < tillDefaults.phoneDigits;
  const blocked = empty || !quote || quote.codeError || quote.approvals.length > 0;
  const panel = useTopOffset<HTMLElement>('--cart-top');

  return (
    <aside ref={panel} className={styles.cart} aria-label={t.title}>
      <div className={styles.cartTop}>
        <Text as="h2" variant="h4">
          {t.title}
        </Text>
        {!empty && (
          <Stack direction="row" gap={vars.spacing[1]}>
            <IconButton icon="pause" label={t.hold} onClick={onHold} />
            <IconButton icon="trash" label={t.cancel} onClick={onCancel} />
          </Stack>
        )}
      </div>

      <div className={styles.cartBody}>
        {empty ? (
          <Text variant="bodySm" color={vars.colors.textMuted}>
            {t.empty}
          </Text>
        ) : (
          <ul className={styles.lines}>
            {(quote?.lines ?? []).map((line) => {
              const discount = discountOf(line.variantId);
              return (
                <li key={line.variantId} className={styles.line}>
                  <span className={styles.lineThumb}>
                    <ProductPhoto src={line.photo} name={line.name} />
                  </span>
                  <span className={styles.lineInfo}>
                    <Text as="span" variant="h4" autoDirection>
                      {line.name}
                    </Text>
                    <Text as="span" variant="caption" color={vars.colors.textMuted}>
                      {[line.brandName, line.size, line.color].join(' / ')}
                    </Text>
                    {line.promotionName && (
                      <Text as="span" variant="caption" color={vars.colors.success}>
                        {fillText(t.promotion, { name: line.promotionName, amount: format.money(line.promotionDiscount, currency) })}
                      </Text>
                    )}
                  </span>
                  <span className={styles.lineEnd}>
                    <Text as="span" variant="h4">
                      {format.money(line.total, currency)}
                    </Text>
                    {line.total < line.unitPrice * line.qty && (
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        <s>{format.money(line.unitPrice * line.qty, currency)}</s>
                      </Text>
                    )}
                  </span>
                  <span className={styles.lineActions}>
                    <QtyStepper value={line.qty} max={stockOf(line.variantId)} onChange={(qty) => setQty(line.variantId, qty)} />
                    {line.manualAllowed ? (
                      <button type="button" className={styles.linkButton} onClick={() => onDiscount(line.variantId)}>
                        {discount ? `${t.discount} ${describe(discount)}` : t.addDiscount}
                      </button>
                    ) : (
                      <Text as="span" variant="caption" color={vars.colors.textMuted}>
                        {t.noDiscountHere}
                      </Text>
                    )}
                    <IconButton icon="close" label={t.remove} onClick={() => remove(line.variantId)} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {missing && (
          <div className={styles.missing} role="status">
            <strong>{fillText(text.cashier.sell.notHere, { item: missing.label, branch: branch?.name ?? '' })}</strong>
            <span>{missing.elsewhere.some((place) => place.qty > 0) ? missing.elsewhere.filter((place) => place.qty > 0).map((place) => fillText(text.cashier.sell.elsewhere, { branch: place.name, count: format.number(place.qty) })).join(' / ') : text.cashier.sell.noneElsewhere}</span>
            {missing.elsewhere.some((place) => place.qty > 0) && (
              <Stack direction="row" wrap gap={vars.spacing[3]}>
                <button type="button" className={styles.linkButton} onClick={() => onReserve('reserve')}>
                  {fillText(text.cashier.sell.reserveIn, { branch: missing.elsewhere.find((place) => place.qty > 0)?.name ?? '' })}
                </button>
                <button type="button" className={styles.linkButton} onClick={() => onReserve('request')}>
                  {text.cashier.sell.requestIt}
                </button>
              </Stack>
            )}
          </div>
        )}

        {!empty && (
          <Stack gap={vars.spacing[3]}>
            <Text as="h3" variant="label" color={vars.colors.textMuted}>
              {t.customer}
            </Text>
            {customer ? (
              <Stack gap={vars.spacing[1]}>
                <Text variant="h4" autoDirection>
                  {customer.name}
                </Text>
                <Text variant="caption" color={vars.colors.textMuted}>
                  {customer.phone} · {fillText(t.customerOrders, { orders: format.number(customer.orders), credit: format.money(customer.storeCredit, currency) })}
                </Text>
                <Stack direction="row" gap={vars.spacing[3]}>
                  <button type="button" className={styles.linkButton} onClick={() => navigate(toPath(routes.cashier.customer, { customerId: customer.id }))}>
                    {t.pastPurchases}
                  </button>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => {
                      onCustomerFound(null);
                      setCart((current) => ({ ...current, customer: { name: '', phone: '' } }));
                    }}
                  >
                    {text.common.edit}
                  </button>
                </Stack>
              </Stack>
            ) : (
              <>
                <SearchBox
                  label={t.customerPhone}
                  placeholder={t.findCustomer}
                  inputMode="tel"
                  listPosition="inline"
                  width="100%"
                  value={cart.customer.phone}
                  onChange={(value) => setCustomer('phone', value)}
                  items={(matches.status === 'success' ? matches.data : []).map((match) => ({ key: match.id, label: match.name, detail: match.phone }))}
                  onSelect={(item) => {
                    const found = matches.status === 'success' ? matches.data.find((match) => match.id === item.key) : undefined;
                    if (!found) return;
                    onCustomerFound(found);
                    setCart((current) => ({ ...current, customer: { name: found.name, phone: found.phone } }));
                  }}
                />
                {phoneMissing && <Text variant="caption" color={vars.colors.danger}>{text.validation.required}</Text>}
                <TextField label={t.customerName} value={cart.customer.name} onChange={(value) => setCustomer('name', value)} error={nameMissing ? text.validation.required : undefined} />
                <TextField label={text.common.age} optional type="number" inputMode="numeric" min={1} max={120} value={cart.customer.age ?? ''} onChange={(value) => setCustomer('age', value)} />
                {phoneDigits(cart.customer.phone).length >= tillDefaults.phoneDigits && matches.status === 'success' && !matches.data.length && (
                  <Text variant="caption" color={vars.colors.textMuted}>
                    {t.newCustomer}
                  </Text>
                )}
              </>
            )}

            {/* The message goes under the whole row, so the box and Apply stay side by side. */}
            <Stack gap={vars.spacing[1]}>
              <Stack direction="row" gap={vars.spacing[2]} align="flex-end">
                <TextField label={t.promoCode} value={code} onChange={(value) => setCode(value.toUpperCase())} invalid={Boolean(quote?.codeError)} />
                <Button variant="secondary" onClick={() => setCart((current) => ({ ...current, promoCode: code.trim() }))}>
                  {t.apply}
                </Button>
              </Stack>
              {quote?.codeError && (
                <Text variant="caption" color={vars.colors.danger}>
                  {t.codeInvalid}
                </Text>
              )}
            </Stack>
            <div>
              <button type="button" className={styles.linkButton} onClick={() => onDiscount(null)}>
                {cart.orderDiscount ? `${t.orderDiscount}: ${describe(cart.orderDiscount)}` : t.orderDiscount}
              </button>
            </div>
          </Stack>
        )}
      </div>

      <div className={styles.cartFooter}>
        {/* The code field may be scrolled out of view: say here why the sale can't be paid. */}
        {quote?.codeError && !empty && (
          <Text variant="caption" color={vars.colors.danger}>
            {t.codeBlocksPay}
          </Text>
        )}
        {quote && !empty && (
          <div className={styles.totals}>
            <div className={styles.row}>
              <span className={styles.muted}>{t.subtotal}</span>
              <span>{format.money(quote.subtotal, currency)}</span>
            </div>
            {quote.discount > 0 && (
              <div className={styles.row}>
                <span className={styles.muted}>{cart.promoCode && quote.promoCodeId ? fillText(t.codeApplied, { code: cart.promoCode }) : t.discounts}</span>
                <span>-{format.money(quote.discount, currency)}</span>
              </div>
            )}
            <div className={`${styles.row} ${styles.totalRow}`}>
              <span>{t.total}</span>
              <span>{format.money(quote.total, currency)}</span>
            </div>
            {quote.vatRate > 0 && (
              <Text variant="caption" color={vars.colors.textMuted}>
                {fillText(t.vatIncluded, { rate: format.percent(quote.vatRate, 0), amount: format.money(quote.vat, currency) })}
              </Text>
            )}
          </div>
        )}

        {quote?.approvals.map((need) => (
          <Notice
            key={`${need.scope}-${need.variantId ?? ''}`}
            tone={need.rejected ? 'danger' : 'warning'}
            action={
              <Button size="sm" variant="secondary" onClick={() => onApproval(need)}>
                {text.cashier.approval.title}
              </Button>
            }
          >
            {need.pendingId
              ? fillText(t.approvalPending, { summary: format.percent(need.percent, 1) })
              : fillText(text.cashier.approval.discountWhy, { percent: format.percent(need.percent, 1), limit: format.percent(need.limit, 0) })}
          </Notice>
        ))}

        {!empty && (
          <Stack gap={vars.spacing[2]}>
            <div className={styles.methods}>
              <Button variant="secondary" disabled={blocked} onClick={() => onPay('pm-cash')}>
                {format.payment('pm-cash')}
              </Button>
              <Button variant="secondary" disabled={blocked} onClick={() => onPay(branch?.paymentMethodIds.includes('pm-card') ? 'pm-card' : 'pm-mada')}>
                {format.payment('pm-card')}
              </Button>
              <Button variant="secondary" disabled={blocked} onClick={() => onPay()}>
                {text.cashier.payment.split}
              </Button>
            </div>
            <Button size="lg" fullWidth disabled={blocked} onClick={() => onPay()}>
              {fillText(t.pay, { amount: format.money(quote?.total ?? 0, currency) })}
            </Button>
          </Stack>
        )}
      </div>
    </aside>
  );
};
