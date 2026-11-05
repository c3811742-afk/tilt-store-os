import { useState } from 'react';
import { deleteExpense, listExpenses, saveExpense, type ExpenseInput } from '@/shared/api';
import { AsyncContent, Badge, BarList, Button, Card, Checkbox, FileField, FilterBar, Grid, Icon, IconButton, Modal, Notice, PageHeader, SelectField, Stack, StatCard, Table, Tabs, TextField } from '@/shared/components';
import { useAction, useAsync, useErrorMessage, useFormat, useLiveVersion, useLocale, useQueryState, useReference } from '@/shared/hooks';
import type { Expense } from '@/shared/types';
import { vars } from '@/shared/theme';
import { downloadDataUrl, today } from '@/shared/utils';
import { BranchSelect, ConfigListEditor, CurrencySelect, ExportButtons, PeriodFilter } from '../../components';
import { usePeriod } from '../../hooks';

type ExpensesTab = 'expenses' | 'categories';

// Rent, salaries, utilities, marketing and other expenses, per branch or for the whole company.
export const ExpensesPage = () => {
  const { text } = useLocale();
  const format = useFormat();
  const { settings, branches } = useReference();
  const errorMessage = useErrorMessage();
  const period = usePeriod('month');
  const [tab, setTab] = useQueryState<ExpensesTab>('tab', 'expenses');
  const [branchId, setBranchId] = useQueryState('branch', '');
  const [categoryId, setCategoryId] = useQueryState('category', '');
  const version = useLiveVersion();
  const state = useAsync(() => listExpenses({ range: period.range, branchId: (branchId || undefined) as string | undefined, categoryId: categoryId || undefined }), [period.range.from, period.range.to, branchId, categoryId, version]);
  const action = useAction();
  const [draft, setDraft] = useState<(ExpenseInput & { id?: string }) | null>(null);
  const t = text.owner.expenses;
  const categories = settings.lists.expenseCategories;
  const currencyOf = (id: string | null) => branches.find((branch) => branch.id === id)?.currency ?? settings.baseCurrency;
  const blank: ExpenseInput = { categoryId: categories[0]?.id ?? '', branchId: null, currency: settings.baseCurrency, amount: 0, date: today(), repeatMonthly: false, note: '' };
  const edit = (expense?: Expense) => setDraft(expense ? { ...expense } : blank);

  return (
    <Stack gap={vars.spacing[5]}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button onClick={() => edit()}>
            <Icon name="plus" />
            {t.add}
          </Button>
        }
      />
      {Boolean(action.error) && <Notice tone="danger">{errorMessage(action.error)}</Notice>}
      <Tabs<ExpensesTab>
        label={t.title}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'expenses', label: t.tabs.expenses },
          { value: 'categories', label: t.tabs.categories },
        ]}
      >
        {tab === 'categories' && <ConfigListEditor listKey="expenseCategories" title={t.tabs.categories} hint={t.categoriesHint} />}
        {tab === 'expenses' && (
          <Stack gap={vars.spacing[4]}>
            <PeriodFilter period={period} />
            <FilterBar>
              <SelectField
                label={text.owner.fields.branch}
                placeholder={text.owner.fields.allBranches}
                value={branchId}
                onChange={setBranchId}
                options={[{ value: 'company', label: text.common.wholeCompany }, ...branches.filter((branch) => !branch.archived).map((branch) => ({ value: branch.id, label: branch.name }))]}
              />
              <SelectField label={t.category} placeholder={text.common.all} value={categoryId} onChange={setCategoryId} options={categories.map((option) => ({ value: option.id, label: format.text(option.label) }))} />
            </FilterBar>
            <AsyncContent state={state}>
              {(data) => {
                const byCategory = categories
                  .map((category) => ({ category, total: data.rows.filter((row) => row.expense.categoryId === category.id).reduce((sum, row) => sum + row.converted, 0) }))
                  .filter((row) => row.total > 0);
                return (
                  <Stack gap={vars.spacing[4]}>
                    <Grid>
                      <StatCard label={t.total} value={format.money(data.total, data.currency)} highlight />
                      <Card title={t.byCategory}>
                        <BarList items={byCategory.map((row) => ({ key: row.category.id, label: format.text(row.category.label), value: row.total, display: format.money(row.total, data.currency) }))} />
                      </Card>
                    </Grid>
                    <Card
                      title={t.list}
                      actions={
                        <ExportButtons
                          title={t.title}
                          tables={() => [
                            {
                              title: t.title,
                              headers: [text.common.date, t.category, text.owner.fields.branch, text.common.note, text.common.currency, text.common.amount],
                              rows: data.rows.map((row) => [row.expense.date, format.option(row.expense.categoryId), format.branch(row.expense.branchId), row.expense.note, row.expense.currency, row.expense.amount]),
                            },
                          ]}
                        />
                      }
                    >
                      <Table
                        label={t.list}
                        emptyText={t.empty}
                        columns={[
                          { key: 'date', label: text.common.date },
                          { key: 'category', label: t.category },
                          { key: 'branch', label: text.owner.fields.branch },
                          { key: 'note', label: text.common.note },
                          { key: 'amount', label: text.common.amount, align: 'end' },
                          { key: 'actions', label: '', align: 'end' },
                        ]}
                        rows={data.rows.map(({ expense }) => ({
                          key: expense.id,
                          cells: {
                            date: format.date(expense.date),
                            category: (
                              <Stack direction="row" gap={vars.spacing[1]} wrap>
                                {format.option(expense.categoryId)}
                                {expense.repeatMonthly && <Badge>{t.monthly}</Badge>}
                              </Stack>
                            ),
                            branch: format.branch(expense.branchId),
                            note: expense.note,
                            amount: format.money(expense.amount, expense.currency),
                            actions: (
                              <Stack direction="row" gap={vars.spacing[1]} justify="flex-end">
                                {expense.receipt && <IconButton icon="file" label={t.receipt} onClick={() => expense.receipt && downloadDataUrl(expense.receipt.dataUrl, expense.receipt.name)} />}
                                <IconButton icon="pencil" label={text.common.edit} onClick={() => edit(expense)} />
                                <IconButton icon="trash" label={text.common.delete} onClick={() => action.run(expense.id, () => deleteExpense(expense.id))} />
                              </Stack>
                            ),
                          },
                        }))}
                      />
                    </Card>
                  </Stack>
                );
              }}
            </AsyncContent>
          </Stack>
        )}
      </Tabs>
      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? t.edit : t.add}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft || !(draft.amount > 0) || !draft.categoryId) return;
          const { id, ...input } = draft;
          if (await action.run('save', () => saveExpense(input, id))) setDraft(null);
        }}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {text.common.cancel}
            </Button>
            <Button type="submit" disabled={Boolean(action.busy) || !draft || !(draft.amount > 0)}>
              {text.common.save}
            </Button>
          </>
        }
      >
        {draft && (
          <Stack gap={vars.spacing[3]}>
            <Grid minColumnWidth={vars.sizes.field.narrow}>
              <SelectField label={t.category} value={draft.categoryId} onChange={(categoryId) => setDraft({ ...draft, categoryId })} options={categories.filter((option) => !option.archived).map((option) => ({ value: option.id, label: format.text(option.label) }))} />
              <BranchSelect
                kinds={['store', 'online', 'warehouse']}
                label={t.assignTo}
                allLabel={text.common.wholeCompany}
                value={draft.branchId ?? ''}
                onChange={(id) => setDraft({ ...draft, branchId: id || null, currency: currencyOf(id || null) })}
              />
              <CurrencySelect usedOnly value={draft.currency} onChange={(currency) => setDraft({ ...draft, currency })} />
              <TextField label={text.common.amount} type="number" min={0} prefix={draft.currency} value={draft.amount ? String(draft.amount) : ''} onChange={(amount) => setDraft({ ...draft, amount: Number(amount) })} />
              <TextField label={text.common.date} type="date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} />
            </Grid>
            <TextField label={text.common.note} value={draft.note} onChange={(note) => setDraft({ ...draft, note })} />
            <Checkbox label={t.repeat} hint={t.repeatHint} checked={draft.repeatMonthly} onChange={(repeatMonthly) => setDraft({ ...draft, repeatMonthly })} />
            <FileField label={t.receipt} accept="image/*,.pdf" value={draft.receipt ?? null} onChange={(receipt) => setDraft({ ...draft, receipt: receipt ?? undefined })} />
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
