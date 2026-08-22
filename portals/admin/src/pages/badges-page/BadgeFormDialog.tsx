import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import { CONDITIONS, type BadgeForm } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  form: BadgeForm;
  setForm: (f: BadgeForm) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function BadgeFormDialog({ open, form, setForm, busy, onClose, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Edit Badge' : 'New Badge'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('shell.common.title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={t('shell.common.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <MediaPickerField
            label={t('admin.badgesPage.image')}
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            folder="/badges"
            helperText={t('admin.badgesPage.imageHint')}
          />
          <TextField
            select
            label={t('admin.badgesPage.condition')}
            value={form.condition_type}
            onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
            fullWidth
          >
            {CONDITIONS.map((c) => (
              <MenuItem key={c.v} value={c.v}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label={t('admin.badgesPage.threshold')}
            value={form.threshold}
            onChange={(e) =>
              setForm({ ...form, threshold: Math.max(1, +e.target.value || 1) })
            }
            disabled={form.condition_type === 'MANUAL'}
            fullWidth
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <Typography variant="body2">{t('admin.badgesPage.activeHint')}</Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('shell.common.cancel')}</Button>
        <Button onClick={onSave} variant="contained" disabled={!form.title || busy}>
          {form.id ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
