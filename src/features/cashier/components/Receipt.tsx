import type { ReceiptView } from '@/shared/api';
import { Barcode, BrandLogo, QrCode } from '@/shared/components';
import { texts } from '@/shared/constants';
import { useFormat, useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import styles from './receipt.module.css';

// A receipt as the printer prints it: always black on white, about the width of 80 mm receipt paper.
// The store's header, policy and footer are printed in the receipt language(s) set by the owner.
export const Receipt = ({ receipt }: { receipt: ReceiptView }) => {
  const { text, locale } = useLocale();
  const format = useFormat();
  const t = text.cashier.receipt;
  const money = (amount: number) => format.money(amount, receipt.currency);
  const both = (value: { en: string; ar: string }) =>
    receipt.language === 'both' ? [...new Set([value.en, value.ar].filter(Boolean))] : [value[receipt.language] || value.en].filter(Boolean);
  // Saudi invoices carry their Arabic title too (ZATCA asks for Arabic on the invoice).
  const invoiceTitle = locale === 'ar' ? t.simplifiedInvoice : `${t.simplifiedInvoice} · ${texts.ar.cashier.receipt.simplifiedInvoice}`;
  const title = receipt.kind === 'sale' ? (receipt.authority === 'zatca' ? invoiceTitle : t.receipt) : receipt.kind === 'exchange' ? t.exchangeReceipt : t.returnReceipt;

  return (
    <article className={styles.receipt} aria-label={title}>
      {receipt.showLogo && (
        <div className={styles.center}>
          <BrandLogo size="md" color={vars.colors.printInk} />
        </div>
      )}
      <div className={styles.center}>
        {both(receipt.header).map((line) => (
          <strong key={line}>{line}</strong>
        ))}
        <span>{receipt.branch.name}</span>
        {receipt.branch.address && <span>{receipt.branch.address}</span>}
        {receipt.registration.legalName && <span>{receipt.registration.legalName}</span>}
        <span>{receipt.registration.vatNumber ? `${t.vatNumber}: ${receipt.registration.vatNumber}` : t.noVatNumber}</span>
        {receipt.registration.commercialRegistration && (
          <span>
            {t.crNumber}: {receipt.registration.commercialRegistration}
          </span>
        )}
      </div>
      <div className={styles.rule} />
      <strong className={styles.center}>{title}</strong>
      <Barcode value={receipt.number} />
      <dl className={styles.meta}>
        <dt>{t.date}</dt>
        <dd>{format.dateTime(receipt.at)}</dd>
        <dt>{t.cashier}</dt>
        <dd>{receipt.cashierName}</dd>
        {receipt.customer && (
          <>
            <dt>{t.customer}</dt>
            <dd>
              <bdi>{receipt.customer.name}</bdi>
            </dd>
            <dt>{t.phone}</dt>
            <dd>
              <bdi>{receipt.customer.phone}</bdi>
            </dd>
          </>
        )}
        {receipt.originalNumber && (
          <>
            <dt>{t.number}</dt>
            <dd>{fillText(t.original, { number: receipt.originalNumber })}</dd>
          </>
        )}
      </dl>
      <div className={styles.rule} />
      <ul className={styles.lines}>
        {receipt.lines.map((line, position) => (
          <li key={position} className={styles.line}>
            <bdi className={styles.lineName}>{line.name}</bdi>
            <span>
              {line.size} · {line.color}
            </span>
            <span className={styles.split}>
              <span>
                {format.number(line.qty)} × {money(line.unitPrice)}
              </span>
              <span>{money(line.unitPrice * line.qty)}</span>
            </span>
            {line.promotionSaving > 0 && (
              <span className={styles.split}>
                <span>
                  <bdi>{line.promotionName}</bdi>: {fillText(t.saved, { amount: money(line.promotionSaving) })}
                </span>
                <span>-{money(line.promotionSaving)}</span>
              </span>
            )}
            {line.otherDiscount > 0 && (
              <span className={styles.split}>
                <span>{t.discount}</span>
                <span>-{money(line.otherDiscount)}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      <div className={styles.rule} />
      <div className={styles.split}>
        <span>{t.subtotal}</span>
        <span>{money(receipt.subtotal)}</span>
      </div>
      {receipt.discount > 0 && (
        <div className={styles.split}>
          <span>{t.discount}</span>
          <span>-{money(receipt.discount)}</span>
        </div>
      )}
      <div className={`${styles.split} ${styles.total}`}>
        <span>{receipt.kind === 'sale' ? t.total : t.refund}</span>
        <span>{money(receipt.total)}</span>
      </div>
      {receipt.vatRate > 0 && (
        <div className={styles.split}>
          <span>{fillText(t.vat, { rate: format.percent(receipt.vatRate, 0) })}</span>
          <span>{money(receipt.vat)}</span>
        </div>
      )}
      <div className={styles.rule} />
      <span className={styles.label}>{receipt.kind === 'sale' ? t.paidBy : t.refundedTo}</span>
      {receipt.payments.map((payment, position) => (
        <div key={position} className={styles.split}>
          <span>
            {format.payment(payment.methodId)}
            {payment.reference ? ` · ${payment.reference}` : ''}
          </span>
          <span>{money(payment.amount)}</span>
        </div>
      ))}
      {receipt.exchangeNumber && <span>{fillText(t.newSale, { number: receipt.exchangeNumber })}</span>}
      {receipt.eReceiptStatus && receipt.authority !== 'none' && <span className={styles.small}>{fillText(t.eReceipt, { status: t.eStatuses[receipt.eReceiptStatus as keyof typeof t.eStatuses] ?? receipt.eReceiptStatus })}</span>}
      {receipt.taxQr && (
        <div className={styles.center}>
          <QrCode value={receipt.taxQr} label={t.simplifiedInvoice} />
        </div>
      )}
      <div className={styles.rule} />
      <div className={`${styles.center} ${styles.small}`}>
        {both(receipt.returnPolicy).map((line) => (
          <span key={line}>{line}</span>
        ))}
        {both(receipt.footer).map((line) => (
          <span key={line}>{line}</span>
        ))}
        <span>{t.thanks}</span>
      </div>
    </article>
  );
};
