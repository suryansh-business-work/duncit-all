import { useEffect } from 'react';
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
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';
import RhfTextField from '../../forms/components/RhfTextField';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import DateField from '../../components/DateField';
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
}: Readonly<Props>) {
  const { control, handleSubmit, reset, setValue } = useForm<CreateForm>({
    defaultValues: form,
    resolver: zodResolver(createUserSchema),
    mode: 'onTouched',
  });

  useEffect(() => {
    reset(form);
  }, [form, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  const pwdAdornment = (
    <InputAdornment position="end">
      <Tooltip title="Generate">
        <IconButton size="small" onClick={() => setValue('password', genPassword(), { shouldValidate: true })}>
          <CasinoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <IconButton size="small" onClick={() => setShowPwd((show) => !show)}>
        {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><RhfTextField control={control} name="first_name" label="First name" required /></Grid>
            <Grid item xs={12} sm={6}><RhfTextField control={control} name="last_name" label="Last name" required /></Grid>
            <Grid item xs={12}><RhfTextField control={control} name="email" type="email" label="Email" hint="Welcome email is sent if provided." /></Grid>
            <Grid item xs={4} sm={3}>
              <Controller
                control={control}
                name="phone_extension"
                render={({ field, fieldState }) => (
                  <PhoneExtensionField value={field.value} onChange={field.onChange} error={!!fieldState.error} helperText={fieldState.error?.message ?? ' '} fullWidth />
                )}
              />
            </Grid>
            <Grid item xs={8} sm={9}><RhfTextField control={control} name="phone_number" label="Phone number" required /></Grid>
            <Grid item xs={12}>
              <Controller
                control={control}
                name="dob"
                render={({ field, fieldState }) => (
                  <DateField label="Date of birth" value={field.value} onChange={field.onChange} error={!!fieldState.error} helperText={fieldState.error?.message ?? ' '} maxDate={new Date()} required />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <RhfTextField control={control} name="password" type={showPwd ? 'text' : 'password'} label="Temporary password" required hint="Minimum 8 characters." InputProps={{ endAdornment: pwdAdornment }} />
            </Grid>
            <Grid item xs={12}>
              <Controller
                control={control}
                name="roles"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Roles"
                    select
                    fullWidth
                    required
                    SelectProps={{ multiple: true }}
                    value={field.value}
                    onChange={(event) => field.onChange(typeof event.target.value === 'string' ? [event.target.value] : event.target.value)}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'At least one role is required.'}
                  >
                    {roles.map((role: any) => <MenuItem key={role.key} value={role.key}>{role.name} ({role.key})</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}><RhfTextField control={control} name="city" label="City" /></Grid>
            <Grid item xs={12} sm={6}><RhfTextField control={control} name="zone" label="Zone" /></Grid>
            {opError && <Grid item xs={12}><Alert severity="error">{opError}</Alert></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Creating…' : 'Create User'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
