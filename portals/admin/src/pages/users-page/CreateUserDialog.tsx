import { useEffect } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Grid, InputAdornment, MenuItem, TextField, Tooltip } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CasinoIcon from '@mui/icons-material/Casino';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import DateField from '../../components/DateField';
import { type CreateForm, genPassword } from './helpers';
import { createUserSchema } from './create-user.form';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
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
      <Tooltip title={t('admin.users.generate')}>
        <DuncitIconButton size="small" onClick={() => setValue('password', genPassword(), { shouldValidate: true })}>
          <CasinoIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <DuncitIconButton size="small" onClick={() => setShowPwd((show) => !show)}>
        {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
      </DuncitIconButton>
    </InputAdornment>
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('admin.users.create')}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}><RhfTextField control={control} name="first_name" label={t('shell.profile.firstName')} required /></Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}><RhfTextField control={control} name="last_name" label={t('shell.profile.lastName')} required /></Grid>
            <Grid size={12}><RhfTextField control={control} name="email" type="email" label={t('shell.common.email')} hint="Welcome email is sent if provided." /></Grid>
            <Grid
              size={{
                xs: 4,
                sm: 3
              }}>
              <Controller
                control={control}
                name="phone_extension"
                render={({ field, fieldState }) => (
                  <PhoneExtensionField value={field.value} onChange={field.onChange} error={!!fieldState.error} helperText={fieldState.error?.message ?? ' '} fullWidth />
                )}
              />
            </Grid>
            <Grid
              size={{
                xs: 8,
                sm: 9
              }}><RhfTextField control={control} name="phone_number" label={t('admin.users.phoneNumber')} required /></Grid>
            <Grid size={12}>
              <Controller
                control={control}
                name="dob"
                render={({ field, fieldState }) => (
                  <DateField label={t('admin.users.dateOfBirth')} value={field.value} onChange={field.onChange} error={!!fieldState.error} helperText={fieldState.error?.message ?? ' '} maxDate={new Date()} required />
                )}
              />
            </Grid>
            <Grid size={12}>
              <RhfTextField control={control} name="password" type={showPwd ? 'text' : 'password'} label={t('admin.users.temporaryPassword')} required hint="Minimum 8 characters." slotProps={{ input: { endAdornment: pwdAdornment } }} />
            </Grid>
            <Grid size={12}>
              <Controller
                control={control}
                name="roles"
                render={({ field, fieldState }) => (
                  <TextField
                    label={t('admin.roles.title')}
                    select
                    fullWidth
                    required
                    value={field.value}
                    onChange={(event) => field.onChange(typeof event.target.value === 'string' ? [event.target.value] : event.target.value)}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'At least one role is required.'}
                    slotProps={{
                      select: { multiple: true }
                    }}
                  >
                    {roles.map((role: any) => <MenuItem key={role.key} value={role.key}>{role.name} ({role.key})</MenuItem>)}
                  </TextField>
                )}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}><RhfTextField control={control} name="city" label={t('admin.profile.city')} /></Grid>
            <Grid
              size={{
                xs: 12,
                sm: 6
              }}><RhfTextField control={control} name="zone" label={t('admin.profile.zone')} /></Grid>
            {opError && <Grid size={12}><Alert severity="error">{opError}</Alert></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions>
          <DuncitButton type="button" onClick={onClose} disabled={busy}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>{busy ? 'Creating…' : t('admin.users.create')}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
