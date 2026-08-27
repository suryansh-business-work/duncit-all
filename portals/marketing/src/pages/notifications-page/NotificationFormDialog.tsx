import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { peopleCount } from '../../lib/reach';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import { DuncitButton } from '@duncit/buttons';
import MediaPickerField from '../../components/MediaPickerField';
import { RhfTextField } from '@duncit/forms';
import { reachOf, type AudienceListOption, type NotifForm, scopes } from './helpers';
import { notificationFormSchema } from './notification.form';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  onClose: () => void;
  form: NotifForm;
  busy: boolean;
  opError: string | null;
  onSubmit: (values: NotifForm) => void;
  locations: any[];
  users: any[];
  audienceLists: AudienceListOption[];
  /** Everybody on the platform — the reach of a Global notification. */
  totalUsers: number;
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
  audienceLists,
  totalUsers,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, setValue, watch, reset } = useForm<NotifForm>({
    defaultValues: form,
    resolver: zodResolver(notificationFormSchema),
    mode: 'onChange',
  });

  useEffect(() => reset(form), [form, reset]);

  const scope = watch('scope');
  const audienceListId = watch('audience_list_id');
  const targetUserIds = watch('target_user_ids');
  const locationId = watch('location_id');
  const location = locations.find((item: any) => item.id === locationId);
  const zones: { zone_name: string }[] = location?.location_zones ?? [];

  const reach = reachOf(
    { scope, target_user_ids: targetUserIds, audience_list_id: audienceListId },
    audienceLists,
    totalUsers,
  );

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('marketing.notifications.newNotification')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {opError && <Alert severity="error">{opError}</Alert>}
            <RhfTextField control={control} name="title" label={t('shell.common.title')} required hint="3–120 characters" />
            <RhfTextField control={control} name="body" label={t('marketing.notifications.body')} required multiline minRows={3} hint="5–1000 characters" />
            <Controller
              control={control}
              name="image_url"
              render={({ field }) => (
                <MediaPickerField
                  label={t('marketing.notifications.imageUrlOptional')}
                  value={field.value}
                  onChange={field.onChange}
                  folder="/notifications"
                />
              )}
            />
            <RhfTextField control={control} name="link_url" label={t('marketing.notifications.linkUrlOptionalEGPods')} />
            <Controller
              control={control}
              name="silent"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label={t('marketing.notifications.silentInAppOnlyNoPush')}
                />
              )}
            />
            <Controller
              control={control}
              name="scope"
              render={({ field }) => (
                <TextField
                  select
                  label={t('marketing.common.audience')}
                  fullWidth
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    setValue('location_id', '');
                    setValue('zone_name', '');
                    setValue('target_user_ids', []);
                    setValue('audience_list_id', '');
                  }}
                >
                  {scopes(t).map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* How many people this audience actually reaches, so nobody sends
                blind. A location or zone has no count of its own. */}
            {reach !== null && (
              <Alert
                severity={reach > 0 ? 'info' : 'warning'}
                icon={<GroupIcon fontSize="small" />}
                data-testid="notif-reach"
              >
                <Typography variant="body2">
                  {reach > 0
                    ? `This reaches ${peopleCount(reach)}.`
                    : 'This reaches nobody right now.'}
                </Typography>
              </Alert>
            )}

            {scope === 'AUDIENCE_LIST' && (
              <Controller
                control={control}
                name="audience_list_id"
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label={t('marketing.common.audienceList')}
                    fullWidth
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'Membership is recomputed when you send.'}
                  >
                    {audienceLists.length === 0 && (
                      <MenuItem disabled value="">
                        No saved lists yet — create one under Target Audience
                      </MenuItem>
                    )}
                    {audienceLists.map((list) => (
                      <MenuItem key={list.id} value={list.id}>
                        {`${list.name} · ${list.member_count.toLocaleString()}`}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}

            {(scope === 'LOCATION' || scope === 'ZONE') && (
              <Controller
                control={control}
                name="location_id"
                render={({ field, fieldState }) => (
                  <TextField
                    select
                    label={t('marketing.common.location')}
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
              <RhfTextField control={control} name="zone_name" label={t('marketing.common.zone')} select disabled={!locationId}>
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
                    label={t('marketing.notifications.users')}
                    fullWidth
                    value={field.value}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? ' '}
                    onChange={(event) => {
                      const next = event.target.value;
                      /* v8 ignore next -- a multiple Select always emits an array, so the string-split branch is only a defensive autofill guard */
                      field.onChange(typeof next === 'string' ? next.split(',') : next);
                    }}
                    slotProps={{
                      select: { multiple: true }
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
          <DuncitButton type="button" onClick={onClose} disabled={busy}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send Now'}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
