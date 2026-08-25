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
import { useTranslation } from '@duncit/shell';
import MediaPickerField from '../../components/MediaPickerField';
import BadgeScopeFields, {
  type BadgeCategoryOption,
  type BadgeRoleOption,
} from './BadgeScopeFields';
import { CONDITIONS, CONDITION_LABEL_KEY, hasThreshold, type BadgeForm } from './queries';

interface Props {
  open: boolean;
  form: BadgeForm;
  setForm: (f: BadgeForm) => void;
  busy: boolean;
  categories: readonly BadgeCategoryOption[];
  roles: readonly BadgeRoleOption[];
  onClose: () => void;
  onSave: () => void;
}

/** Create or edit one badge — its copy, artwork, the condition that unlocks it
 * and whatever that condition needs to be measurable. */
export default function BadgeFormDialog({
  open,
  form,
  setForm,
  busy,
  categories,
  roles,
  onClose,
  onSave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const title = form.id ? t('admin.badgesPage.editBadge') : t('admin.badgesPage.newBadge');
  const confirmLabel = form.id ? t('shell.common.save') : t('admin.badgesPage.createBadge');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
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
              <MenuItem key={c} value={c}>
                {t(CONDITION_LABEL_KEY[c])}
              </MenuItem>
            ))}
          </TextField>
          <BadgeScopeFields
            form={form}
            setForm={setForm}
            categories={categories}
            roles={roles}
          />
          <TextField
            type="number"
            label={t('admin.badgesPage.threshold')}
            value={form.threshold}
            onChange={(e) => setForm({ ...form, threshold: Math.max(1, +e.target.value || 1) })}
            disabled={!hasThreshold(form.condition_type)}
            fullWidth
          />
          <TextField
            type="number"
            label={t('admin.badgesPage.sortOrder')}
            helperText={t('admin.badgesPage.sortOrderHint')}
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: +e.target.value || 0 })}
            fullWidth
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
