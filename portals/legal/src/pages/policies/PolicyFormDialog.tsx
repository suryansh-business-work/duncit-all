import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import PolicyTypeSelect from '../../components/PolicyTypeSelect';
import { useTranslation } from '@duncit/shell';

export interface PolicyFormState {
  slug: string;
  title: string;
  /** Groups this policy on the dashboard. Blank counts as "Other". */
  policy_type: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

export const EMPTY_POLICY_FORM: PolicyFormState = {
  slug: '',
  title: '',
  policy_type: '',
  content: '',
  is_active: true,
  sort_order: 0,
};

interface Props {
  open: boolean;
  isNew: boolean;
  editingTitle: string;
  form: PolicyFormState;
  error: string | null;
  saving: boolean;
  onTitle: (title: string) => void;
  onChange: (patch: Partial<PolicyFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function PolicyFormDialog({
  open,
  isNew,
  editingTitle,
  form,
  error,
  saving,
  onTitle,
  onChange,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <DialogTitle>{isNew ? 'New Policy' : `Edit · ${editingTitle}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label={t('shell.common.title')} value={form.title} onChange={(e) => onTitle(e.target.value)} required fullWidth autoFocus />
            <TextField
              label={t('legal.policies.slug')}
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              required
              fullWidth
              helperText={t('legal.policies.slugHint')}
            />
          </Stack>
          <PolicyTypeSelect
            value={form.policy_type}
            onChange={(policy_type) => onChange({ policy_type })}
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label={t('legal.policies.sortOrder')}
              type="number"
              value={form.sort_order}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
              size="small"
              sx={{ width: 150 }}
            />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />}
              label={form.is_active ? 'Active (visible in app)' : 'Hidden'}
            />
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">{t('legal.policies.content')}</Typography>
            <DuncitRichTextInput
              value={form.content}
              onChange={(value) => onChange({ content: value })}
              minHeight={260}
              aiContext="legal policy"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>{t('shell.common.cancel')}</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {isNew ? 'Create' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
