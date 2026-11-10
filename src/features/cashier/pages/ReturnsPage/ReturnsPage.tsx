import { useEffect, useRef, useState } from 'react';
import { findSalesForReturn, getReturnableSale } from '@/shared/api';
import { AsyncContent, Notice, PageHeader, SearchBox, Stack, Table, Text } from '@/shared/components';
import { useAsync, useFormat, useLiveVersion, useLocale, useQueryState, useReference, useBranchScope } from '@/shared/hooks';
import { vars } from '@/shared/theme';
import { fillText } from '@/shared/utils';
import { ReturnForm } from './ReturnForm';

// Returns and exchanges: find the sale (scan the receipt's barcode, or type its number, the phone or a date),
// then choose what comes back and how the customer gets their money or new items.
export const ReturnsPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const version = useLiveVersion();
  const { branch } = useBranchScope();
  const { branches, settings } = useReference();
  const branchId = branch?.id ?? '';
  const t = text.cashier.returns;
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useQueryState('q', '');
  const [saleId, setSaleId] = useQueryState('sale', '');
  const results = useAsync(() => findSalesForReturn(branchId, submitted), [branchId, submitted]);
  const sale = useAsync(() => (saleId ? getReturnableSale(branchId, saleId) : Promise.resolve(null)), [branchId, saleId, version]);
  // A scanned receipt (or its exact number) opens that sale straight away.
  const exact = results.status === 'success' && results.data.length === 1 && results.data[0].number.toLowerCase() === submitted.toLowerCase() ? results.data[0].saleId : '';
  const opened = useRef(''); // once only: "Back" from that sale stays on the results
  useEffect(() => {
    if (exact && opened.current !== exact) {
      opened.current = exact;
      setSaleId(exact);
    }
  }, [exact, setSaleId]);

  const policy = settings.countries.find((country) => country.countryCode === branch?.countryCode)?.returns;
  const from = branches.filter((current) => current.id === branchId || (policy?.otherBranch && current.countryCode === branch?.countryCode && current.kind !== 'warehouse')).map((current) => current.name);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader title={t.title} />
      <Stack gap={vars.spacing[1]}>
        <SearchBox
          label={t.search}
          placeholder={t.search}
          value={query}
          onChange={setQuery}
          onSubmit={(value) => {
            setSaleId('');
            setSubmitted(value.trim());
          }}
          width="100%"
          autoFocus={!saleId}
        />
        <Text variant="caption" color={vars.colors.textMuted}>
          {fillText(t.searchHint, { branches: from.join(text.common.listSeparator) })}
          {settings.crossCountryExchange && ` ${t.crossCountryHint}`}
        </Text>
      </Stack>
      {submitted && !saleId && (
        <AsyncContent state={results} empty={<Notice>{fillText(t.noMatch, { query: submitted })}</Notice>}>
          {(rows) => (
            <Table
              filterable={false} // a lookup: the search box finds the receipt
              label={t.results}
              stackOnMobile
              columns={[
                { key: 'number', label: text.cashier.mySales.receipt },
                { key: 'at', label: text.common.date },
                { key: 'customer', label: text.cashier.mySales.customer },
                { key: 'pieces', label: text.cashier.mySales.pieces, align: 'end' },
                { key: 'total', label: text.common.total, align: 'end' },
              ]}
              rows={rows.map((row) => ({
                key: row.saleId,
                onClick: () => setSaleId(row.saleId),
                cells: {
                  number: row.number,
                  at: fillText(t.soldAt, { branch: row.branchName, date: format.dateTime(row.at) }),
                  customer: [row.customerName, row.phone].filter(Boolean).join(' · '),
                  pieces: format.number(row.pieces),
                  total: format.money(row.total, row.currency),
                },
              }))}
            />
          )}
        </AsyncContent>
      )}
      {saleId && <AsyncContent state={sale}>{(current) => current && <ReturnForm key={current.saleId} sale={current} onBack={() => setSaleId('')} />}</AsyncContent>}
    </Stack>
  );
};
