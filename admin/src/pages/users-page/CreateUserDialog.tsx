import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import { Form, Formik, type FormikErrors, type FormikTouched } from 'formik';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import { type CreateForm, genPassword } from './helpers';
import { createUserSchema } from './create-user.form';

interface Props {
  open: boolean;
  onClose: () => void;
  form: CreateForm;
  showPwd: boolean;
  setShowPwd: React.Dispatch<React.SetStateAction<boolean>>;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: CreateForm) => void;
  roles: any[];
}

function showError(
  values: CreateForm,
  errors: FormikErrors<CreateForm>,
  touched: FormikTouched<CreateForm>,
  submitCount: number,
  key: keyof CreateForm
) {
  const value = values[key];
  const hasValue = Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
  return Boolean(errors[key] && (submitCount > 0 || touched[key] || hasValue));
}

export default function CreateUserDialog({
  open,
  onClose,
  form,
  showPwd,
  setShowPwd,
  busy,
  opError,
  onSubmit,
  roles,
}: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <Formik<CreateForm>
        initialValues={form}
        enableReinitialize
        validationSchema={createUserSchema}
        validateOnBlur
        validateOnChange
        onSubmit={(values) => onSubmit(values)}
      >
        {({ values, errors, touched, submitCount, handleBlur, handleChange, setFieldValue }) => {
          const err = (key: keyof CreateForm) => showError(values, errors, touched, submitCount, key);
          const help = (key: keyof CreateForm, fallback = ' ') => (err(key) ? String(errors[key]) : fallback);
          return (
            <Form noValidate>
              <DialogTitle>Create User</DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField label="First name" name="first_name" value={values.first_name} onChange={handleChange} onBlur={handleBlur} error={err('first_name')} helperText={help('first_name')} fullWidth required /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Last name" name="last_name" value={values.last_name} onChange={handleChange} onBlur={handleBlur} error={err('last_name')} helperText={help('last_name')} fullWidth required /></Grid>
                  <Grid item xs={12}><TextField label="Email" name="email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={err('email')} helperText={help('email', 'Welcome email is sent if provided.')} fullWidth /></Grid>
                  <Grid item xs={4} sm={3}><PhoneExtensionField value={values.phone_extension} onChange={(value) => setFieldValue('phone_extension', value)} error={err('phone_extension')} helperText={help('phone_extension')} fullWidth /></Grid>
                  <Grid item xs={8} sm={9}><TextField label="Phone number" name="phone_number" value={values.phone_number} onChange={handleChange} onBlur={handleBlur} error={err('phone_number')} helperText={help('phone_number')} fullWidth required /></Grid>
                  <Grid item xs={12}><TextField label="Date of birth" name="dob" type="date" value={values.dob} onChange={handleChange} onBlur={handleBlur} error={err('dob')} helperText={help('dob')} InputLabelProps={{ shrink: true }} fullWidth required /></Grid>
                  <Grid item xs={12}>
                    <TextField label="Temporary password" name="password" type={showPwd ? 'text' : 'password'} value={values.password} onChange={handleChange} onBlur={handleBlur} error={err('password')} helperText={help('password', 'Minimum 8 characters.')} fullWidth required InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="Generate"><IconButton size="small" onClick={() => setFieldValue('password', genPassword())}><CasinoIcon fontSize="small" /></IconButton></Tooltip><IconButton size="small" onClick={() => setShowPwd((show) => !show)}>{showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}</IconButton></InputAdornment> }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Roles" name="roles" select SelectProps={{ multiple: true }} value={values.roles} onChange={(event) => setFieldValue('roles', typeof event.target.value === 'string' ? [event.target.value] : event.target.value)} onBlur={handleBlur} error={err('roles')} helperText={help('roles', 'At least one role is required.')} fullWidth required>
                      {roles.map((role: any) => <MenuItem key={role.key} value={role.key}>{role.name} ({role.key})</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}><TextField label="City" name="city" value={values.city} onChange={handleChange} onBlur={handleBlur} error={err('city')} helperText={help('city')} fullWidth /></Grid>
                  <Grid item xs={12} sm={6}><TextField label="Zone" name="zone" value={values.zone} onChange={handleChange} onBlur={handleBlur} error={err('zone')} helperText={help('zone')} fullWidth /></Grid>
                  {opError && <Grid item xs={12}><Alert severity="error">{opError}</Alert></Grid>}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button type="button" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Creating…' : 'Create User'}</Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
