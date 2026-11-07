import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getExchangeChain, getReceipt, logReceipt } from '@/shared/api';
import { AsyncContent, Button, Card, Notice, PageHeader, PrintArea, Stack, Text, TextField } from '@/shared/components';
import { brand, routes, toPath } from '@/shared/constants';
import { useAsync, useFormat, useLocale, useQueryState } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText, safeAsync } from '@/shared/utils';
import { Receipt } from '../../components/Receipt';

// One receipt: print it (again), send it on WhatsApp or by SMS, and see the sale's exchange history.
export const ReceiptPage = () => {
  const { saleId = '' } = useParams();
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const [print] = useQueryState('print', '');
  const [done] = useQueryState('done', '');
  const state = useAsync(() => getReceipt(saleId), [saleId]);
  const chain = useAsync(() => (state.status === 'success' ? getExchangeChain(state.data.saleId) : Promise.resolve([])), [state.status === 'success' ? state.data.saleId : '']);
  const [phone, setPhone] = useState<string | null>(null);
  const printed = useRef(false);
  const t = text.cashier.receipts;
  const receipt = state.status === 'success' ? state.data : null;

  const printNow = (again: boolean) => {
    void safeAsync(() => logReceipt(saleId, again ? 'reprint' : 'print'));
    window.print();
  };

  // After a card payment the receipt prints by itself, once.
  useEffect(() => {
    if (print && receipt && !printed.current) {
      printed.current = true;
      printNow(false);
    }
  });

  // WhatsApp and SMS open on the device with the message ready; the receipt being sent is logged.
  const send = (how: 'whatsApp' | 'sms', url: string) => {
    void safeAsync(() => logReceipt(saleId, how));
    window.open(url, '_blank', 'noopener');
  };

  const to = (phone ?? receipt?.customer?.phone ?? '').replace(/[^0-9+]/g, '');
  const message = receipt ? fillText(text.cashier.receipt.message, { store: brand.name, number: receipt.number, total: format.money(receipt.total, receipt.currency) }) : '';

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={receipt ? `${t.kinds[receipt.kind]} ${receipt.number}` : t.title}
        back={{ to: routes.cashier.receipts, label: t.back }}
        actions={
          done && (
            <Button variant="secondary" onClick={() => navigate(routes.cashier.sell)}>
              {t.newSale}
            </Button>
          )
        }
      />
      {done && receipt && <Notice tone="success">{fillText(text.cashier.payment.done, { number: receipt.number })}</Notice>}
      <AsyncContent state={state}>
        {(current) => (
          <>
            <Receipt receipt={current} />
            <PrintArea>
              <Receipt receipt={current} />
            </PrintArea>
          </>
        )}
      </AsyncContent>
      {receipt && (
        <Card>
          <Stack direction="row" wrap gap={vars.spacing[2]}>
            <Button onClick={() => printNow(!done)}>{done ? t.print : t.reprint}</Button>
          </Stack>
          <Stack direction="row" wrap gap={vars.spacing[2]} align="flex-end">
            <TextField label={t.sendTo} type="tel" inputMode="tel" value={phone ?? receipt.customer?.phone ?? ''} onChange={setPhone} />
            <Button variant="secondary" disabled={!to} onClick={() => send('whatsApp', `https://wa.me/${to.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`)}>
              {t.whatsApp}
            </Button>
            <Button variant="secondary" disabled={!to} onClick={() => send('sms', `sms:${to}?body=${encodeURIComponent(message)}`)}>
              {t.sms}
            </Button>
          </Stack>
        </Card>
      )}
      <AsyncContent state={chain} loading={null} error={null} empty={null}>
        {(links) =>
          links.length > 1 ? (
            <Card title={text.cashier.returns.chain}>
              <Stack gap={vars.spacing[2]}>
                {links.map((link) => (
                  <Stack key={link.id} direction="row" justify="space-between" align="center" gap={vars.spacing[3]}>
                    <Text as="span" variant="bodySm">
                      {text.cashier.returns.chainKinds[link.kind]} {link.number} · {format.dateTime(link.at)}
                    </Text>
                    <Button size="sm" variant="muted" onClick={() => navigate(toPath(routes.cashier.receipt, { saleId: link.id }))}>
                      {text.common.view}
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </Card>
          ) : null
        }
      </AsyncContent>
    </Stack>
  );
};
