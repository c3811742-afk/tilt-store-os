import { useNavigate } from 'react-router';
import { listHeldSales, takeHeldSale } from '@/shared/api';
import { AsyncContent, Button, Card, Notice, PageHeader, Stack, Text } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { useCart } from '../../hooks/useCart';

// Sales on hold: resume one into the counter, or cancel it.
export const HeldPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const navigate = useNavigate();
  const errorMessage = useErrorMessage();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const { cart, setCart } = useCart();
  const action = useAction();
  const t = text.cashier.held;
  const state = useAsync(() => listHeldSales(branch?.id ?? ''), [branch?.id, version]);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} subtitle={t.subtitle} />
      {cart.items.length > 0 && <Notice tone="warning">{text.cashier.cart.replaceCart}</Notice>}
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <AsyncContent state={state} empty={<Notice>{t.empty}</Notice>}>
        {(list) => (
          <Stack gap={vars.spacing[3]}>
            {list.map((held) => (
              <Card
                key={held.id}
                title={`${held.number} · ${held.customer?.name || t.noCustomer}`}
                actions={
                  <>
                    <Button
                      size="sm"
                      disabled={cart.items.length > 0 || Boolean(action.busy)}
                      onClick={async () => {
                        const taken = await action.run(held.id, () => takeHeldSale(held.id));
                        if (!taken) return;
                        setCart(() => ({ items: taken.items, orderDiscount: taken.orderDiscount, promoCode: taken.promoCode ?? '', customer: taken.customer ?? { name: '', phone: '' } }));
                        navigate(routes.cashier.sell);
                      }}
                    >
                      {t.resume}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={Boolean(action.busy)} onClick={() => action.run(`cancel-${held.id}`, () => takeHeldSale(held.id, true))}>
                      {t.cancel}
                    </Button>
                  </>
                }
              >
                <Text variant="bodySm" color={vars.colors.textSecondary} autoDirection>
                  {held.names}
                </Text>
                <Text variant="caption" color={vars.colors.textMuted}>
                  {fillText(t.pieces, { count: format.number(held.pieces) })} · {format.dateTime(held.at)}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </AsyncContent>
    </Stack>
  );
};
