import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  completeSale,
  getCounterItems,
  getItemStock,
  getMyShift,
  holdSale,
  logCancelledSale,
  quoteSale,
  type ApprovalInput,
  type ApprovalNeed,
  type CounterVariant,
  type CustomerView,
  type TillPayment,
} from '@/shared/api';
import { AsyncContent, Button, Modal, Notice, SearchBox, Stack, Text, OfflineStockNotice } from '@/shared/components';
import { routes, toPath, withQuery, tillDefaults } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useBranchScope, useReference } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync, phoneDigits } from '@/shared/utils';
import { ApprovalModal } from '../../components/ApprovalModal';
import { CounterHeader } from '../../components/CounterHeader';
import { DiscountModal } from '../../components/DiscountModal';
import { PaymentModal } from '../../components/PaymentModal';
import { ProductCard } from '../../components/ProductCard';
import { ReserveModal, type ReserveTarget } from '../../components/ReserveModal';
import { ShiftGate } from '../../components/ShiftGate';
import { useCart } from '../../hooks/useCart';
import { CartPanel, type MissingItem } from './CartPanel';
import styles from '../../components/counter.module.css';

const pageSize = 48;

// Selling at the counter: scan or search items into the cart, discounts and approvals, the customer, and payment.
export const SellPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings } = useReference();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const { cart, setCart, clear, addItem } = useCart();
  const t = text.cashier;
  const branchId = branch?.id ?? '';

  const shift = useAsync(() => getMyShift(branchId), [branchId, version]);
  const items = useAsync(() => getCounterItems(branchId), [branchId, version]);
  const cartInput = { branchId, items: cart.items, orderDiscount: cart.orderDiscount, promoCode: cart.promoCode };
  const quote = useAsync(() => quoteSale(cartInput), [JSON.stringify(cartInput), version]);
  const currentQuote = quote.status === 'success' ? quote.data : null; // kept on screen while a change reloads it

  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(pageSize);
  const [message, setMessage] = useState<{ tone: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const [missing, setMissing] = useState<MissingItem | null>(null);
  const [reserve, setReserve] = useState<ReserveTarget | null>(null);
  const [discountFor, setDiscountFor] = useState<string | null | undefined>(undefined); // a variant, null for the whole sale
  const [approvalFor, setApprovalFor] = useState<ApprovalNeed | null>(null);
  const [paying, setPaying] = useState<string | 'any' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [customer, setCustomer] = useState<CustomerView | null>(null);
  const [tried, setTried] = useState(false);
  const action = useAction();

  const products = useMemo(() => (items.status === 'success' ? items.data : []), [items]);
  const variants = useMemo(() => new Map(products.flatMap((product) => product.variants.map((variant) => [variant.variantId, { product, variant }] as const))), [products]);
  const stockOf = (variantId: string) => variants.get(variantId)?.variant.available ?? 0;
  const inCart = (variantId: string) => cart.items.find((item) => item.variantId === variantId)?.qty ?? 0;
  const labelOf = (variantId: string) => {
    const entry = variants.get(variantId);
    return entry ? `${entry.product.name} ${entry.variant.size} ${entry.variant.color}` : '';
  };

  // Filter by name, brand, size, colour or SKU: every word must match something.
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matching = words.length
    ? products.filter((product) => {
        const haystack = [product.name, product.brandName, ...product.variants.flatMap((variant) => [variant.size, variant.color, variant.sku, variant.barcode])].join(' ').toLowerCase();
        return words.every((word) => haystack.includes(word));
      })
    : products;

  const add = (variant: CounterVariant) => {
    setMissing(null);
    if (!addItem(variant.variantId, variant.available)) return setMessage({ tone: 'warning', text: fillText(t.sell.maxReached, { count: variant.available }) });
    setMessage({ tone: 'success', text: fillText(t.sell.added, { item: labelOf(variant.variantId) }) });
  };

  // A scanner types the barcode and presses Enter: add that piece. A typed SKU works the same way.
  const scan = (value: string) => {
    const code = value.trim().toLowerCase();
    if (!code) return;
    const found = [...variants.values()].find(({ variant }) => variant.barcode === code || variant.sku.toLowerCase() === code);
    if (!found) return matching.length ? undefined : setMessage({ tone: 'warning', text: fillText(t.sell.notFound, { code: value.trim() }) });
    setQuery('');
    if (found.variant.available - inCart(found.variant.variantId) <= 0 || found.variant.price === null) return void showMissing(found.variant);
    add(found.variant);
  };

  const showMissing = async (variant: CounterVariant) => {
    const entry = variants.get(variant.variantId);
    if (!entry) return;
    const result = await safeAsync(() => getItemStock(branchId, entry.product.productId));
    const stock = result.ok ? result.data.variants.find((current) => current.variantId === variant.variantId) : undefined;
    setMissing({ label: labelOf(variant.variantId), variantId: variant.variantId, elsewhere: (stock?.elsewhere ?? []).map(({ branchId: id, name, qty }) => ({ branchId: id, name, qty })) });
  };

  const approvalRequest = (need: ApprovalNeed): ApprovalInput => ({
    branchId,
    kind: need.kind,
    level: need.level,
    percent: need.percent, // exact: a rounded-down percent would no longer cover the discount it approves
    amount: need.amount,
    currency: currentQuote?.currency,
    summary:
      need.scope === 'order'
        ? fillText(t.approval.summaryOrder, { percent: format.percent(need.percent, 1) })
        : fillText(t.approval.summaryDiscount, { percent: format.percent(need.percent, 1), item: labelOf(need.variantId ?? '') }),
  });
  const setApprovalId = (need: ApprovalNeed, approvalId: string) =>
    setCart((current) =>
      need.scope === 'order'
        ? { ...current, orderDiscount: current.orderDiscount && { ...current.orderDiscount, approvalId } }
        : { ...current, items: current.items.map((item) => (item.variantId === need.variantId && item.discount ? { ...item, discount: { ...item.discount, approvalId } } : item)) },
    );

  const pay = (payments: TillPayment[]) =>
    action.run('pay', async () => {
      const sale = await completeSale({ ...cartInput, customer: cart.customer, payments, heldSaleId: cart.heldSaleId });
      clear();
      setCustomer(null);
      setTried(false);
      setPaying(null);
      // A card payment approved by the machine prints the receipt right away.
      const byCard = payments.some((payment) => payment.methodId === 'pm-card' || payment.methodId === 'pm-mada');
      navigate(withQuery(toPath(routes.cashier.receipt, { saleId: sale.id }), { print: byCard ? '1' : undefined, done: '1' }));
    });

  const openShift = shift.status === 'success' ? shift.data.summary?.shift : undefined;

  return (
    <Stack gap={vars.spacing[5]}>
      <CounterHeader shiftOpenedAt={openShift?.openedAt} />
      <OfflineStockNotice />
      <AsyncContent state={shift}>
        {(current) =>
          !current.summary ? (
            <ShiftGate />
          ) : (
            <div className={styles.layout}>
              <Stack gap={vars.spacing[3]}>
                <SearchBox label={t.sell.scan} placeholder={t.sell.scanPlaceholder} value={query} onChange={(value) => { setQuery(value); setShown(pageSize); }} onSubmit={scan} width="100%" autoFocus />
                {message && <Notice tone={message.tone}>{message.text}</Notice>}
                <AsyncContent state={items}>
                  {() =>
                    matching.length ? (
                      <Stack gap={vars.spacing[3]}>
                        <div className={styles.grid}>
                          {matching.slice(0, shown).map((product) => (
                            <ProductCard key={product.productId} product={product} currency={branch?.currency ?? ''} inCart={inCart} onAdd={add} onMissing={(variant) => void showMissing(variant)} />
                          ))}
                        </div>
                        {matching.length > shown && (
                          <div>
                            <Button variant="secondary" onClick={() => setShown(shown + pageSize)}>
                              {t.sell.showMore}
                            </Button>
                          </div>
                        )}
                      </Stack>
                    ) : (
                      <Notice>{fillText(t.sell.noItems, { query })}</Notice>
                    )
                  }
                </AsyncContent>
              </Stack>
              <Stack gap={vars.spacing[2]}>
                {quote.status === 'error' && <Notice tone="danger">{errorMessage(quote.error)}</Notice>}
                <CartPanel
                  quote={currentQuote}
                  stockOf={stockOf}
                  missing={missing}
                  onReserve={(mode) => missing && setReserve({ mode, variantId: missing.variantId, label: missing.label, branches: missing.elsewhere, customer: cart.customer.name ? cart.customer : undefined })}
                  onDiscount={setDiscountFor}
                  onApproval={setApprovalFor}
                  onPay={(methodId) => {
                    setTried(true);
                    if (!cart.customer.name.trim() || phoneDigits(cart.customer.phone).length < tillDefaults.phoneDigits) return;
                    setPaying(methodId ?? 'any');
                  }}
                  onHold={async () => {
                    if (await action.run('hold', () => holdSale({ ...cartInput, customer: cart.customer }))) {
                      clear();
                      setCustomer(null);
                      setMessage({ tone: 'info', text: t.cart.held });
                    }
                  }}
                  onCancel={() => setCancelling(true)}
                  onCustomerFound={setCustomer}
                  customer={customer}
                  tried={tried}
                />
                {Boolean(action.error) && !paying && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
              </Stack>
            </div>
          )
        }
      </AsyncContent>

      {discountFor !== undefined && (
        <DiscountModal
          open
          title={discountFor === null ? t.discount.orderTitle : `${t.discount.title}: ${labelOf(discountFor)}`}
          current={discountFor === null ? cart.orderDiscount : cart.items.find((item) => item.variantId === discountFor)?.discount}
          limitPercent={currentQuote?.discountLimit ?? 0}
          onClose={() => setDiscountFor(undefined)}
          onSave={(discount) => {
            setCart((current) =>
              discountFor === null ? { ...current, orderDiscount: discount } : { ...current, items: current.items.map((item) => (item.variantId === discountFor ? { ...item, discount } : item)) },
            );
            setDiscountFor(undefined);
          }}
        />
      )}

      <ApprovalModal
        request={approvalFor && approvalRequest(approvalFor)}
        pendingId={approvalFor?.pendingId}
        why={
          approvalFor && (
            <>
              {fillText(t.approval.discountWhy, { percent: format.percent(approvalFor.percent, 1), limit: format.percent(approvalFor.limit, 0) })}{' '}
              {approvalFor.level === 'owner' && fillText(t.approval.ownerWhy, { limit: format.percent(settings.discountLimits.manager, 0) })}
            </>
          )
        }
        onApproved={(approvalId) => {
          if (approvalFor) setApprovalId(approvalFor, approvalId);
          setApprovalFor(null);
        }}
        onSent={(approvalId) => {
          if (approvalFor) setApprovalId(approvalFor, approvalId);
          setApprovalFor({ ...(approvalFor as ApprovalNeed), pendingId: approvalId });
        }}
        onClose={() => setApprovalFor(null)}
      />

      {paying && currentQuote && branch && (
        <PaymentModal
          open
          due={currentQuote.total}
          currency={currentQuote.currency}
          methodIds={branch.paymentMethodIds}
          storeCredit={customer?.storeCredit ?? 0}
          startWith={paying === 'any' ? undefined : paying}
          busy={action.busy === 'pay'}
          error={action.error ? errorMessage(action.error) : undefined}
          onComplete={(payments) => void pay(payments)}
          onClose={() => {
            setPaying(null);
            action.clearError();
          }}
        />
      )}

      {reserve && <ReserveModal key={`${reserve.mode}-${reserve.variantId}`} target={reserve} onClose={() => setReserve(null)} onDone={() => setMissing(null)} />}

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title={t.cart.cancel}
        actions={
          <>
            <Button variant="secondary" onClick={() => setCancelling(false)}>
              {t.cart.keep}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await action.run('cancel', () => logCancelledSale(branchId, cart.items.map((item) => variants.get(item.variantId)?.variant.sku ?? item.variantId)));
                clear();
                setCustomer(null);
                setCancelling(false);
              }}
            >
              {t.cart.cancel}
            </Button>
          </>
        }
      >
        <Text variant="bodySm">{t.cart.cancelConfirm}</Text>
      </Modal>
    </Stack>
  );
};
