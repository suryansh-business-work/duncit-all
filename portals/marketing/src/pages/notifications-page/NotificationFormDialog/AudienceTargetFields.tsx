import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { AudienceListOption, NotifForm } from '../helpers';

interface Props {
  control: Control<NotifForm>;
  setValue: UseFormSetValue<NotifForm>;
  scope: NotifForm['scope'];
  locationId: NotifForm['location_id'];
  zones: { zone_name: string }[];
  locations: any[];
  users: any[];
  audienceLists: AudienceListOption[];
}

/** The scope-specific pickers: audience list, location, zone or users. */
export default function AudienceTargetFields({
  control,
  setValue,
  scope,
  locationId,
  zones,
  locations,
  users,
  audienceLists,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
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
    </>
  );
}
