import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, labelize } from './queries';

export interface ExpenseFilterState {
  from: Date | null;
  to: Date | null;
  category: string;
  payment_method: string;
  search: string;
  min_amount: string;
  max_amount: string;
}

interface Props {
  value: ExpenseFilterState;
  onChange: (next: ExpenseFilterState) => void;
}

/** Rich filter bar for the expense ledger. */
export default function ExpenseFilters({ value, onChange }: Readonly<Props>) {
  const set = <K extends keyof ExpenseFilterState>(key: K) => (v: ExpenseFilterState[K]) => onChange({ ...value, [key]: v });

  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        label="Search vendor, description or reference"
        value={value.search}
        onChange={(e) => set('search')(e.target.value)}
        fullWidth
      />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
        <DatePicker label="From" value={value.from} onChange={set('from')} slotProps={{ textField: { size: 'small' } }} />
        <DatePicker label="To" value={value.to} onChange={set('to')} slotProps={{ textField: { size: 'small' } }} />
        <TextField select size="small" label="Category" value={value.category} onChange={(e) => set('category')(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All categories</MenuItem>
          {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{labelize(c)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Method" value={value.payment_method} onChange={(e) => set('payment_method')(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All methods</MenuItem>
          {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{labelize(m)}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Min ₹" type="number" value={value.min_amount} onChange={(e) => set('min_amount')(e.target.value)} sx={{ width: 110 }} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
        <TextField size="small" label="Max ₹" type="number" value={value.max_amount} onChange={(e) => set('max_amount')(e.target.value)} sx={{ width: 110 }} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
      </Stack>
    </Stack>
  );
}
