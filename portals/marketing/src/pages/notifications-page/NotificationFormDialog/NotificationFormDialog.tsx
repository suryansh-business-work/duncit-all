import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { peopleCount } from '../../../lib/reach';
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
import MediaPickerField from '../../../components/MediaPickerField';
import { RhfTextField } from '@duncit/forms';
import { reachOf, type AudienceListOption, type NotifForm, scopes } from '../helpers';
import { notificationFormSchema } from '../notification.form';
import { useTranslation } from '@duncit/app-settings';
import AudienceTargetFields from './AudienceTargetFields';

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
  const { control, handleSubmit, setValue, watch, reset } = useForm<NotifForm, any, NotifForm>({
    defaultValues: form,
    resolver: zodResolver(notificationFormSchema) as unknown as Resolver<NotifForm, any, NotifForm>,
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

            <AudienceTargetFields
              control={control}
              setValue={setValue}
              scope={scope}
              locationId={locationId}
              zones={zones}
              locations={locations}
              users={users}
              audienceLists={audienceLists}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton type="button" onClick={onClose} disabled={busy}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={busy}>{busy ? 'Sending…' : 'Send Now'}</DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
