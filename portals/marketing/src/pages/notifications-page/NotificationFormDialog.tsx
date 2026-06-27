import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import MediaPickerField from '../../components/MediaPickerField';
import RhfTextField from '../../forms/components/RhfTextField';
import { type NotifForm, SCOPES } from './helpers';
import { notificationFormSchema } from './notification.form';

interface Props {
  open: boolean;
  onClose: () => void;
  form: NotifForm;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: NotifForm) => void;
  locations: any[];
  users: any[];
}

export default function NotificationFormDialog({
  open,
  onClose,
  form,
  busy,
  opError,
  onSubmit,
  locations,
  users,
}: Readonly<Props>) {
  const { control, handleSubmit, setValue, watch, reset } = useForm<NotifForm>({
    defaultValues: form,
    resolver: zodResolver(notificationFormSchema),
    mode: 'onChange',
  });

  useEffect(() => reset(form), [form, reset]);

  const scope = watch('scope');
  const locationId = watch('location_id');
  const location = locations.find((item: any) => item.id === locationId);
  const zones: { zone_name: string }[] = location?.location_zones ?? [];

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>New Notification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {opError && <Alert severity="error">{opError}</Alert>}
            <RhfTextField control={control} name="title" label="Title" required />
            <RhfTextField control={control} name="body" label="Body" required multiline minRows={3} />
            <Controller
              control={control}
              name="image_url"
              render={({ field }) => (
                <MediaPickerField
                  label="Image URL (optional)"
                  value={field.value}
                  onChange={field.onChange}
                  folder="/notifications"
                />
              )}
            />
            <RhfTextField control={control} name="link_url" label="Link URL (optional, e.g. /pods/abc)" />
            <Controller
              control={control}
              name="silent"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label="Silent (in-app only — no push alert)"
                />
              )}
            />
            <Controller
              control={control}
              name="scope"
              render={({ field }) => (
                <TextField
                  select
                  label="Audience"
                  fullWidth
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    setValue('location_id', '');
                    setValue('zone_name', '');
                    setValue('target_user_ids', []);
                  }}
                >
                  {SCOPES.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {(scope === 'LOCATION' || scope === 'ZONE') && (
              <Controller
                control={control}
                name="location_id"
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label="Location"
                    fullWidth
                    value={field.value}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? ' '}
                    onChange={(event) => {
                      field.onChange(event.target.value);
                      setValue('zone_name', '');
                    }}
                  >
                    {locations.map((item: any) => (
                      <MenuItem key={item.id} value={item.id}>{item.location_name}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {scope === 'ZONE' && (
              <RhfTextField control={control} name="zone_name" label="Zone" select disabled={!locationId}>
                {zones.map((zone) => (
                  <MenuItem key={zone.zone_name} value={zone.zone_name}>{zone.zone_name}</MenuItem>
                ))}
              </RhfTextField>
            )}

            {scope === 'USER' && (
              <Controller
                control={control}
                name="target_user_ids"
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label="Users"
                    fullWidth
                    value={field.value}
                    onBlur={field.onBlur}
                    SelectProps={{ multiple: true }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? ' '}
                    onChange={(event) => {
                      const next = event.target.value;
                      field.onChange(typeof next === 'string' ? next.split(',') : next);
                    }}
                  >
                    {users.map((user: any) => (
                      <MenuItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.email || user.phone_number}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send Now'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
