import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Divider,
  Drawer,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { SingleImageUploadField } from '@duncit/media-picker';
import {
  ADD_REFUND,
  CREATE_EXPENSE,
  DELETE_EXPENSE,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  REMOVE_REFUND,
  UPDATE_EXPENSE,
  labelize,
} from './queries';
import RefundTimeline from './RefundTimeline';
import { useTranslation } from '@duncit/app-settings';

const BLANK = { category: 'RENT', amount: '', vendor_name: '', payment_method: 'BANK_TRANSFER', reference: '', description: '', attachment_url: '' };

interface Props {
  open: boolean;
  expense: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExpenseDrawer({ open, expense, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
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
  const currentDate = () => date ?? new Date();
  const input = () => ({ ...form, amount: Number(form.amount), date: currentDate().toISOString() });

  const save = async () => {
    setError(null);
    if (Number(form.amount) <= 0) return setError(t('finance.expenseManagement.enterAnAmountGreaterThan0'));
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
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{
      paper: { sx: { width: { xs: '100%', sm: 440 }, p: 2.5 } }
    }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          mb: 1
        }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            flex: 1
          }}>
          {editing ? 'Expense details' : 'New expense'}
        </Typography>
        {editing && (
          <DuncitIconButton color="error" aria-label={t('finance.expenseManagement.deleteExpense')} onClick={remove}>
            <DeleteOutlineIcon />
          </DuncitIconButton>
        )}
        <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      <Stack spacing={1.75}>
        <DatePicker label={t('finance.common.date')} value={date} onChange={setDate} slotProps={{ textField: { fullWidth: true } }} />
        <TextField select label={t('finance.expenseManagement.category')} value={form.category} onChange={(e) => set('category')(e.target.value)} fullWidth>
          {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{labelize(c)}</MenuItem>)}
        </TextField>
        <TextField label={t('finance.common.amount')} required type="number" value={form.amount} onChange={(e) => set('amount')(e.target.value)} fullWidth slotProps={{
          input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }
        }} />
        <TextField label={t('finance.expenseManagement.vendorPayee')} value={form.vendor_name} onChange={(e) => set('vendor_name')(e.target.value)} fullWidth />
        <TextField select label={t('finance.expenseManagement.paymentMethod')} value={form.payment_method} onChange={(e) => set('payment_method')(e.target.value)} fullWidth>
          {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{labelize(m)}</MenuItem>)}
        </TextField>
        <TextField label={t('finance.expenseManagement.referenceTxnId')} value={form.reference} onChange={(e) => set('reference')(e.target.value)} fullWidth />
        <TextField label={t('shell.common.description')} value={form.description} onChange={(e) => set('description')(e.target.value)} multiline minRows={2} fullWidth />
        <SingleImageUploadField
          variant="url-button"
          label={t('finance.expenseManagement.receiptAttachmentUrl')}
          value={form.attachment_url}
          onChange={set('attachment_url')}
          folder="/expenses"
          accept="image/*,.pdf"
          maxBytes={null}
          buttonLabel="Upload"
        />
        <DuncitButton variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : saveLabel}
        </DuncitButton>
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
