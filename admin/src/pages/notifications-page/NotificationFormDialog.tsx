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
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import MediaPickerField from '../../components/MediaPickerField';
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

function fieldError(
  values: NotifForm,
  errors: FormikErrors<NotifForm>,
  touched: FormikTouched<NotifForm>,
  submitCount: number,
  key: keyof NotifForm
) {
  const error = errors[key];
  const value = values[key];
  const hasValue = Array.isArray(value)
    ? value.length > 0
    : typeof value === 'boolean' || String(value ?? '').length > 0;
  return Boolean(error && (submitCount > 0 || touched[key] || hasValue));
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
}: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik<NotifForm>
        initialValues={form}
        enableReinitialize
        validationSchema={notificationFormSchema}
        validateOnBlur
        validateOnChange
        onSubmit={(values) => onSubmit(values)}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue }) => {
          const err = (key: keyof NotifForm) => fieldError(values, errors, touched, submitCount, key);
          const help = (key: keyof NotifForm) => (err(key) ? String(errors[key]) : ' ');
          const location = locations.find((item: any) => item.id === values.location_id);
          const zones: { zone_name: string }[] = location?.location_zones ?? [];

          return (
            <Form noValidate>
              <DialogTitle>New Notification</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} sx={{ pt: 1 }}>
                  {opError && <Alert severity="error">{opError}</Alert>}
                  <TextField label="Title" name="title" value={values.title} onChange={handleChange} onBlur={handleBlur} error={err('title')} helperText={help('title')} required fullWidth />
                  <TextField label="Body" name="body" value={values.body} onChange={handleChange} onBlur={handleBlur} error={err('body')} helperText={help('body')} required multiline minRows={3} fullWidth />
                  <MediaPickerField label="Image URL (optional)" value={values.image_url} onChange={(url) => setFieldValue('image_url', url)} folder="/notifications" />
                  <TextField label="Link URL (optional, e.g. /pods/abc)" name="link_url" value={values.link_url} onChange={handleChange} onBlur={handleBlur} error={err('link_url')} helperText={help('link_url')} fullWidth />
                  <FormControlLabel control={<Switch checked={values.silent} onChange={(_, checked) => setFieldValue('silent', checked)} />} label="Silent (in-app only — no push alert)" />
                  <TextField
                    select
                    label="Audience"
                    name="scope"
                    value={values.scope}
                    onChange={(event) => {
                      setFieldValue('scope', event.target.value);
                      setFieldValue('location_id', '');
                      setFieldValue('zone_name', '');
                      setFieldValue('target_user_ids', []);
                    }}
                    fullWidth
                  >
                    {SCOPES.map((scope) => <MenuItem key={scope.value} value={scope.value}>{scope.label}</MenuItem>)}
                  </TextField>

                  {(values.scope === 'LOCATION' || values.scope === 'ZONE') && (
                    <TextField select label="Location" name="location_id" value={values.location_id} onChange={(event) => { setFieldValue('location_id', event.target.value); setFieldValue('zone_name', ''); }} onBlur={handleBlur} error={err('location_id')} helperText={help('location_id')} fullWidth>
                      {locations.map((item: any) => <MenuItem key={item.id} value={item.id}>{item.location_name}</MenuItem>)}
                    </TextField>
                  )}

                  {values.scope === 'ZONE' && (
                    <TextField select label="Zone" name="zone_name" value={values.zone_name} onChange={handleChange} onBlur={handleBlur} disabled={!values.location_id} error={err('zone_name')} helperText={help('zone_name')} fullWidth>
                      {zones.map((zone) => <MenuItem key={zone.zone_name} value={zone.zone_name}>{zone.zone_name}</MenuItem>)}
                    </TextField>
                  )}

                  {values.scope === 'USER' && (
                    <TextField select label="Users" name="target_user_ids" value={values.target_user_ids} onChange={(event) => setFieldValue('target_user_ids', typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value)} onBlur={handleBlur} SelectProps={{ multiple: true }} error={err('target_user_ids')} helperText={help('target_user_ids')} fullWidth>
                      {users.map((user: any) => <MenuItem key={user.user_id} value={user.user_id}>{user.full_name || user.email || user.phone_number}</MenuItem>)}
                    </TextField>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send Now'}</Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
