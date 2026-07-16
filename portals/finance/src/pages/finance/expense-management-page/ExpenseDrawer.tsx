import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { SingleImageUploadField } from '@duncit/media-picker';
import { ADD_REFUND, CREATE_EXPENSE, DELETE_EXPENSE, EXPENSE_CATEGORIES, PAYMENT_METHODS, REMOVE_REFUND, UPDATE_EXPENSE, labelize } from './queries';
import RefundTimeline from './RefundTimeline';

const BLANK = { category: 'RENT', amount: '', vendor_name: '', payment_method: 'BANK_TRANSFER', reference: '', description: '', attachment_url: '' };

interface Props {
  open: boolean;
  expense: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExpenseDrawer({ open, expense, onClose, onSaved }: Readonly<Props>) {
  const [current, setCurrent] = useState<any>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [create, createState] = useMutation(CREATE_EXPENSE);
  const [update, updateState] = useMutation(UPDATE_EXPENSE);
  const [addRefund] = useMutation(ADD_REFUND);
  const [removeRefund] = useMutation(REMOVE_REFUND);
  const [del] = useMutation(DELETE_EXPENSE);
  const editing = !!current;
  const saving = createState.loading || updateState.loading;

  useEffect(() => {
    setError(null);
    setCurrent(expense);
    setDate(expense ? new Date(expense.date) : new Date());
    setForm(
      expense
        ? { category: expense.category, amount: String(expense.amount), vendor_name: expense.vendor_name, payment_method: expense.payment_method, reference: expense.reference, description: expense.description, attachment_url: expense.attachment_url }
        : BLANK
    );
  }, [expense, open]);

  const set = (key: keyof typeof BLANK) => (value: string) => setForm((p) => ({ ...p, [key]: value }));
  const input = () => ({ ...form, amount: Number(form.amount), date: (date ?? new Date()).toISOString() });

  const save = async () => {
    setError(null);
    if (Number(form.amount) <= 0) return setError('Enter an amount greater than 0');
    try {
      if (editing) await update({ variables: { id: current.id, input: input() } });
      else await create({ variables: { input: input() } });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const refund = async (refundInput: { date: string; amount: number; note: string }) => {
    const res = await addRefund({ variables: { id: current.id, input: refundInput } });
    setCurrent(res.data?.addExpenseRefund ?? current);
    onSaved();
  };
  const dropRefund = async (refund_id: string) => {
    const res = await removeRefund({ variables: { id: current.id, refund_id } });
    setCurrent(res.data?.removeExpenseRefund ?? current);
    onSaved();
  };
  const remove = async () => {
    await del({ variables: { id: current.id } });
    onSaved();
    onClose();
  };

  const saveLabel = editing ? 'Save changes' : 'Add expense';

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 2.5 } }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>
          {editing ? 'Expense details' : 'New expense'}
        </Typography>
        {editing && (
          <IconButton color="error" aria-label="Delete expense" onClick={remove}>
            <DeleteOutlineIcon />
          </IconButton>
        )}
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      <Stack spacing={1.75}>
        <DatePicker label="Date" value={date} onChange={setDate} slotProps={{ textField: { fullWidth: true } }} />
        <TextField select label="Category" value={form.category} onChange={(e) => set('category')(e.target.value)} fullWidth>
          {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{labelize(c)}</MenuItem>)}
        </TextField>
        <TextField label="Amount" type="number" value={form.amount} onChange={(e) => set('amount')(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} fullWidth />
        <TextField label="Vendor / payee" value={form.vendor_name} onChange={(e) => set('vendor_name')(e.target.value)} fullWidth />
        <TextField select label="Payment method" value={form.payment_method} onChange={(e) => set('payment_method')(e.target.value)} fullWidth>
          {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{labelize(m)}</MenuItem>)}
        </TextField>
        <TextField label="Reference / txn id" value={form.reference} onChange={(e) => set('reference')(e.target.value)} fullWidth />
        <TextField label="Description" value={form.description} onChange={(e) => set('description')(e.target.value)} multiline minRows={2} fullWidth />
        <SingleImageUploadField
          variant="url-button"
          label="Receipt / attachment URL"
          value={form.attachment_url}
          onChange={set('attachment_url')}
          folder="/expenses"
          accept="image/*,.pdf"
          maxBytes={null}
          buttonLabel="Upload"
        />
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </Stack>

      {editing && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <RefundTimeline expense={current} onAdd={refund} onRemove={dropRefund} />
        </Box>
      )}
    </Drawer>
  );
}
