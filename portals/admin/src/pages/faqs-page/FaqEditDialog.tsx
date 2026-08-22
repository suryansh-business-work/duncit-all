import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { FormState } from './helpers';
import { useTranslation } from '@duncit/shell';

interface Props {
  editing: any;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  error: string | null;
  supers: any[];
  onClose: () => void;
  onSubmit: () => void;
}

export default function FaqEditDialog({
  editing,
  form,
  setForm,
  saving,
  error,
  supers,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!editing} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing?.id ? 'Edit FAQ' : t('admin.faqs.newFaq')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('admin.dashboard.superCategory')}
            value={form.super_category_id}
            onChange={(e) => setForm({ ...form, super_category_id: e.target.value })}
            fullWidth
            helperText={t('admin.faqs.generalHint')}
          >
            <MenuItem value="">{t('admin.faqs.generalOption')}</MenuItem>
            {supers.map((sc) => (
              <MenuItem key={sc.id} value={sc.id}>
                {sc.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('admin.faqs.question')}
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label={t('admin.faqs.answer')}
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            multiline
            minRows={4}
            fullWidth
            required
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label={t('admin.podPlans.sortOrder')}
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              sx={{ width: 160 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              }
              label={t('admin.profile.active')}
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
