import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import ExpenseRow from './ExpenseRow';
import {
  formatRupees,
  newExpense,
  type ExpenseTotals,
  type PodExpense,
  type PodProfitInputs,
} from '../types';

interface Props {
  expenses: PodExpense[];
  /** One pod's expense totals per side — the chips under the list. */
  totals: ExpenseTotals;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

/**
 * The pod's cost lines.
 *
 * An array of rows rather than three totals, because the question a reader
 * brings here is which line to cut — and "host expenses: ₹3,100" answers that
 * for nobody. Every edit REPLACES the array rather than mutating it: the
 * defaults object shares one empty array with every pod that starts from it.
 */
export default function ExpensesCard({ expenses, totals, onChange }: Readonly<Props>) {
  const { t } = useTranslation();

  const setExpenses = (next: PodExpense[]) => onChange('expenses', next);

  const patchAt = (key: string, patch: Partial<PodExpense>) =>
    setExpenses(
      expenses.map((expense) =>
        expense.expense_key === key ? { ...expense, ...patch } : expense
      )
    );

  const chips: readonly (readonly [string, string, number])[] = [
    ['DUNCIT', t('finance.calculators.duncitExpenses'), totals.DUNCIT],
    ['HOST', t('finance.calculators.hostExpenses'), totals.HOST],
    ['VENUE', t('finance.calculators.venueExpenses'), totals.VENUE],
  ];
  const spent = totals.DUNCIT + totals.HOST + totals.VENUE;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <PaymentsOutlinedIcon color="primary" />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t('finance.calculators.expenses')}
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          {t('finance.calculators.expensesIntro')}
        </Typography>

        <Stack spacing={1.5}>
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.expense_key}
              expense={expense}
              onChange={(patch) => patchAt(expense.expense_key, patch)}
              onRemove={() =>
                setExpenses(expenses.filter((row) => row.expense_key !== expense.expense_key))
              }
            />
          ))}
        </Stack>

        {expenses.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('finance.calculators.noExpensesYet')}
          </Typography>
        )}

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 2 }}
        >
          <DuncitButton
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setExpenses([...expenses, newExpense()])}
          >
            {t('finance.calculators.addExpense')}
          </DuncitButton>
        </Stack>

        {spent > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {chips.map(([key, label, value]) => (
                <Chip
                  key={key}
                  size="small"
                  variant="outlined"
                  label={`${label}: ${formatRupees(value)}`}
                />
              ))}
              <Chip
                size="small"
                color="primary"
                label={`${t('finance.calculators.totalExpenses')}: ${formatRupees(spent)}`}
              />
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
