import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  expense: any;
  onAdd: (input: { date: string; amount: number; note: string }) => Promise<void>;
  onRemove: (refundId: string) => Promise<void>;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
};

function TimelineRow({ date, label, amount, onRemove }: Readonly<{ date: string; label: string; amount: number; onRemove?: () => void }>) {
  const credit = amount > 0;
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: credit ? 'success.main' : 'error.main', flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fmtDate(date)}
        </Typography>
      </Box>
      <Typography variant="body2" fontWeight={800} color={credit ? 'success.main' : 'error.main'}>
        {credit ? '+' : '−'}₹{Math.abs(amount).toFixed(2)}
      </Typography>
      {onRemove && (
        <IconButton size="small" color="error" aria-label="Remove refund" onClick={onRemove}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}

export default function RefundTimeline({ expense, onAdd, onRemove }: Readonly<Props>) {
  const [date, setDate] = useState<Date | null>(new Date());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const remaining = expense.net_amount;

  const add = async () => {
    if (Number(amount) <= 0 || !date) return;
    setBusy(true);
    try {
      await onAdd({ date: date.toISOString(), amount: Number(amount), note });
      setAmount('');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={800}>
        Refunds &amp; timeline
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Gross ₹${expense.amount.toFixed(2)}`} />
        <Chip size="small" color="warning" label={`Refunded ₹${expense.refund_total.toFixed(2)}`} />
        <Chip size="small" color="success" label={`Net ₹${expense.net_amount.toFixed(2)}`} />
      </Stack>

      <Stack spacing={1.25} sx={{ pl: 0.5 }}>
        <TimelineRow date={expense.date} label="Expense recorded" amount={-expense.amount} />
        {(expense.refunds ?? []).map((r: any) => (
          <TimelineRow key={r.refund_id} date={r.date} label={r.note || 'Refund received'} amount={r.amount} onRemove={() => onRemove(r.refund_id)} />
        ))}
      </Stack>

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Record a refund (max ₹{remaining.toFixed(2)})
      </Typography>
      <Stack direction="row" spacing={1}>
        <DatePicker label="Refund date" value={date} onChange={setDate} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
        <TextField label="Amount" required size="small" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} sx={{ width: 160 }} />
      </Stack>
      <TextField label="Note" size="small" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
      <Button variant="outlined" onClick={add} disabled={busy || remaining <= 0}>
        Add refund
      </Button>
    </Stack>
  );
}
