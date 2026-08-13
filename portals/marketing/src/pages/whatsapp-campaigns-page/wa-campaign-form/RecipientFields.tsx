import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { WA_AUDIENCE_HINTS, WA_AUDIENCE_LABELS, WA_AUDIENCE_OPTIONS } from '../helpers';
import type { WaAudienceList } from '../queries';
import ManualContactsField from './ManualContactsField';
import UserPickerField from './UserPickerField';
import type { WaCampaignValues } from './wa-campaign.types';

/**
 * Who this send goes to. One selector, and exactly one thing under it — the
 * other three are cleared when the source changes, so a form can never carry a
 * picked list and typed-in numbers at the same time.
 */

interface Props {
  control: Control<WaCampaignValues>;
  setValue: UseFormSetValue<WaCampaignValues>;
  audience: string;
  audienceLists: WaAudienceList[];
}

export default function RecipientFields({
  control,
  setValue,
  audience,
  audienceLists,
}: Readonly<Props>) {
  const clearOthers = () => {
    setValue('audience_list_id', '');
    setValue('users', []);
    setValue('contacts', []);
  };

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="audience"
        render={({ field }) => (
          <TextField
            select
            label="Send to"
            fullWidth
            value={field.value}
            onBlur={field.onBlur}
            helperText={WA_AUDIENCE_HINTS[field.value] ?? ' '}
            onChange={(event) => {
              field.onChange(event.target.value);
              clearOthers();
            }}
          >
            {WA_AUDIENCE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />

      {audience === 'AUDIENCE_LIST' && (
        <RhfTextField
          control={control}
          name="audience_list_id"
          label={WA_AUDIENCE_LABELS.AUDIENCE_LIST}
          select
          hint="Membership is recomputed when you send"
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
        </RhfTextField>
      )}

      {audience === 'SPECIFIC_USERS' && <UserPickerField control={control} />}
      {audience === 'MANUAL_NUMBERS' && <ManualContactsField control={control} />}
    </Stack>
  );
}
