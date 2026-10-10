import { Controller, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { makeDeviceId } from '@duncit/user-core';
import { useTranslation } from '../../../i18n/useTranslation';
import type { AttendeeOption, RosterValues } from './roster.types';

interface Props {
  control: Control<RosterValues>;
  kind: 'competitors' | 'players';
  title: string;
  attendees: AttendeeOption[];
  /** Teams a player can join (players only). */
  teams?: { id: string; name: string }[];
  disabled: boolean;
}

/** A stable id for a new row, so a player can join a team before it is saved. */
const newRowId = () => makeDeviceId().slice(-8);

/** Editable rows of people: a name, an optional linked attendee and (players) a team. */
export default function PersonRows({ control, kind, title, attendees, teams, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows = useFieldArray({ control, name: kind });
  const values = useWatch({ control, name: kind });

  const add = () =>
    kind === 'players'
      ? rows.append({ player_id: newRowId(), name: '', user_id: '', team_id: teams?.[0]?.id ?? '' })
      : rows.append({ competitor_id: newRowId(), name: '', user_id: '' });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="h3">
        {title}
      </Typography>
      {rows.fields.map((f, i) => (
        <Stack key={f.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
          <Controller
            name={`${kind}.${i}.name`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField {...field} size="small" label={t('mweb.challenge.fields.name')} error={!!fieldState.error} helperText={fieldState.error?.message} disabled={disabled} sx={{ flex: 2 }} />
            )}
          />
          <Controller
            name={`${kind}.${i}.user_id`}
            control={control}
            render={({ field }) => (
              <TextField
                select
                size="small"
                label={t('mweb.challenge.fields.attendee')}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={disabled}
                sx={{ flex: 2 }}
              >
                <MenuItem value="">{t('mweb.challenge.notLinked')}</MenuItem>
                {attendees.map((a) => (
                  <MenuItem key={a.user_id} value={a.user_id}>
                    {a.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          {kind === 'players' && (
            <Controller
              name={`players.${i}.team_id`}
              control={control}
              render={({ field }) => (
                <TextField select size="small" label={t('mweb.challenge.fields.team')} {...field} disabled={disabled} sx={{ flex: 1 }}>
                  {(teams ?? []).map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}
          <Tooltip title={t('mweb.challenge.remove', { vars: { name: values?.[i]?.name ?? '' } })}>
            <span>
              <IconButton aria-label={t('mweb.challenge.remove', { vars: { name: values?.[i]?.name ?? '' } })} onClick={() => rows.remove(i)} disabled={disabled}>
                <DeleteOutlinedIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ))}
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={add} disabled={disabled || (kind === 'players' && !teams?.length)} sx={{ alignSelf: 'flex-start' }}>
        {t(kind === 'players' ? 'mweb.challenge.addPlayer' : 'mweb.challenge.addCompetitor')}
      </DuncitButton>
    </Stack>
  );
}
