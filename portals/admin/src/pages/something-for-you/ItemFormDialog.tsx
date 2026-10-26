import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import MediaPickerField from '../../components/MediaPickerField';
import CallToActionSection from './CallToActionSection';
import { TITLE_MAX, type SomethingForYouForm } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  form: SomethingForYouForm;
  setForm: (next: SomethingForYouForm) => void;
  busy: boolean;
  /** The server's refusal of the last save, shown until the next save or close. */
  error?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ItemFormDialog({
  open,
  form,
  setForm,
  busy,
  error,
  onClose,
  onSave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const tooLong = form.title.length > TITLE_MAX;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Edit card' : 'New card'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" data-testid="sfy-form-error">
              {error}
            </Alert>
          )}
          {/* Counted here rather than trimmed later: the card is a fixed size
              on both surfaces, so a longer headline is not wrapped, it is cut
              off — and this is the last moment anyone can choose what stays. */}
          <TextField
            label={t('shell.common.title')}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
            fullWidth
            error={tooLong}
            data-testid="sfy-form-title"
            helperText={`${form.title.length}/${TITLE_MAX} — shown over the image, up to three lines`}
            slotProps={{
              htmlInput: { maxLength: TITLE_MAX }
            }}
          />
          <MediaPickerField
            label={t('admin.somethingForYou.cardImage')}
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            folder="/something-for-you"
            helperText={t('admin.somethingForYou.cardImageHint')}
          />
          <TextField
            label={t('admin.somethingForYou.bottomText')}
            value={form.bottom_text}
            onChange={(event) => setForm({ ...form, bottom_text: event.target.value })}
            fullWidth
            helperText={t('admin.somethingForYou.bottomTextHint')}
          />
          <CallToActionSection form={form} setForm={setForm} />
          <TextField
            label={t('admin.podPlans.sortOrder')}
            type="number"
            value={form.sort_order}
            onChange={(event) =>
              setForm({ ...form, sort_order: Number(event.target.value) || 0 })
            }
            fullWidth
            helperText={t('admin.somethingForYou.sortHint')}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                slotProps={{ input: { 'data-testid': 'sfy-form-active' } as Record<string, string> }}
              />
            }
            label={t('admin.somethingForYou.showOnHome')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={onSave}
          disabled={busy || !form.title.trim() || tooLong}
          data-testid="sfy-form-save"
        >
          Save
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
