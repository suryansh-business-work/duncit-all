import {
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import { EXPENSE_BEARERS, type ExpenseBearer, type PodExpense } from '../types';

interface Props {
  expense: PodExpense;
  onChange: (patch: Partial<PodExpense>) => void;
  onRemove: () => void;
}

/**
 * One cost line: what it was, who pays it, how much.
 *
 * The bearer sits between the label and the amount because it is the field that
 * changes the answer — an amount typed against the wrong side moves money out
 * of the wrong net, and reading left to right is what catches it.
 */
export default function ExpenseRow({ expense, onChange, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();

  // Built here rather than inline so the option list is not a nested map inside
  // the JSX, and so both the label and its key come from one place.
  const bearerLabel: Record<ExpenseBearer, string> = {
    DUNCIT: t('finance.calculators.borneByDuncit'),
    HOST: t('finance.calculators.borneByHost'),
    VENUE: t('finance.calculators.borneByVenue'),
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ alignItems: { sm: 'flex-start' } }}
    >
      <TextField
        label={t('finance.calculators.expenseLabel')}
        size="small"
        value={expense.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder={t('finance.calculators.expenseNamePlaceholder')}
        sx={{ flex: 1, minWidth: 0 }}
      />
      <TextField
        select
        label={t('finance.calculators.borneBy')}
        size="small"
        value={expense.borne_by}
        onChange={(e) => onChange({ borne_by: e.target.value as ExpenseBearer })}
        sx={{ width: { xs: '100%', sm: 130 }, flexShrink: 0 }}
      >
        {EXPENSE_BEARERS.map((bearer) => (
          <MenuItem key={bearer} value={bearer}>
            {bearerLabel[bearer]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('finance.calculators.expenseAmount')}
        type="number"
        size="small"
        value={expense.amount}
        onChange={(e) => onChange({ amount: Math.max(0, Number(e.target.value)) })}
        sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <CurrencyRupeeIcon fontSize="small" />
              </InputAdornment>
            ),
          },
          htmlInput: { min: 0, step: 50 },
        }}
      />
      <Tooltip title={t('finance.calculators.removeExpense')}>
        {/* The tooltip's string title becomes the button's accessible name, so
            the icon button carries no aria-label of its own to fight with it. */}
        <IconButton size="small" color="error" onClick={onRemove} sx={{ mt: { sm: 0.5 } }}>
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
