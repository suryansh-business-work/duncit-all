import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import MediaPickerField from '../../components/MediaPickerField';
import LocationHierarchyFields from './LocationHierarchyFields';
import LocationLaunchFields from './LocationLaunchFields';
import LocationZonesField from './LocationZonesField';
import { launchTargetError, whatsappGroupUrlError, type LocForm, type ZoneEdit } from './types';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
  busy: boolean;
  opError: string | null;
  onClose: () => void;
  onSubmit: () => void;
  updateZone: (idx: number, patch: Partial<ZoneEdit>) => void;
  addZone: () => void;
  removeZone: (idx: number) => void;
}

export default function LocationFormDialog({
  open,
  form,
  setForm,
  busy,
  opError,
  onClose,
  onSubmit,
  updateZone,
  addZone,
  removeZone,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const launchInvalid = Boolean(
    launchTargetError(form.launch_target) || whatsappGroupUrlError(form.whatsapp_group_url)
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{form.id ? 'Edit Location' : 'New Location'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <LocationHierarchyFields form={form} setForm={setForm} />
          {form.id && (
            <Stack direction="row" spacing={1} sx={{
              alignItems: "center"
            }}>
              <Switch
                slotProps={{ input: { 'aria-label': t('admin.profile.active'), 'data-testid': 'location-form-active' } as Record<string, string> }}
                checked={form.is_active}
                onChange={(_, v) => setForm({ ...form, is_active: v })}
              />
              <Typography variant="body2">{form.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}</Typography>
            </Stack>
          )}
          <LocationLaunchFields form={form} setForm={setForm} />
          <MediaPickerField
            label={t('admin.locations.imageUrl')}
            value={form.location_image}
            onChange={(url) => setForm({ ...form, location_image: url })}
            folder="/locations"
            required
          />

          <LocationZonesField
            form={form}
            setForm={setForm}
            busy={busy}
            updateZone={updateZone}
            addZone={addZone}
            removeZone={removeZone}
          />

          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !form.location_name.trim() || launchInvalid}
        >
          {busy ? 'Saving…' : 'Save'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
