import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Autocomplete, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import PersonRows from './PersonRows';
import { buildRosterSchema, type AttendeeOption, type RosterValues } from './roster.types';

export interface RosterFormProps {
  values: RosterValues;
  teamMode: boolean;
  attendees: AttendeeOption[];
  saving: boolean;
  onSubmit: (values: RosterValues) => Promise<void> | void;
  onCancel: () => void;
}

/** Host Studio > Challenge > Roster: competitors (or teams), players and judges. */
export function RosterForm({ values, teamMode, attendees, saving, onSubmit, onCancel }: Readonly<RosterFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildRosterSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<RosterValues>({ resolver: zodResolver(schema), values });
  const competitors = useWatch({ control, name: 'competitors' });
  const teams = competitors.map((c) => ({ id: c.competitor_id, name: c.name }));

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      {formState.errors.competitors?.message && <Alert severity="error">{formState.errors.competitors.message}</Alert>}
      <PersonRows
        control={control}
        kind="competitors"
        title={t(teamMode ? 'mweb.challenge.teams' : 'mweb.challenge.competitors')}
        attendees={attendees}
        disabled={saving}
      />
      {teamMode && (
        <PersonRows control={control} kind="players" title={t('mweb.challenge.players')} attendees={attendees} teams={teams} disabled={saving} />
      )}
      <Controller
        name="judge_user_ids"
        control={control}
        render={({ field }) => (
          <Autocomplete
            multiple
            size="small"
            disabled={saving}
            options={attendees}
            value={attendees.filter((a) => field.value.includes(a.user_id))}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(a, b) => a.user_id === b.user_id}
            onChange={(_e, next) => field.onChange(next.map((a) => a.user_id))}
            renderInput={(params) => <TextField {...params} label={t('mweb.challenge.judges')} helperText={t('mweb.challenge.judgesHint')} />}
          />
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onCancel} disabled={saving}>
          {t('mweb.challenge.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" disabled={saving || !formState.isDirty}>
          {t('mweb.challenge.saveRoster')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
