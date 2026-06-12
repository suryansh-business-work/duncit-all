import { Controller } from 'react-hook-form';
import { Autocomplete, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { CreatePodClub, CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
}

/** Step 1 — title, mode, searchable club (host = signed-in user) and hashtags. */
export default function ClubStep({ form, clubs }: Readonly<Props>) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={2}>
      <TextField
        label="Pod title"
        required
        fullWidth
        {...register('pod_title')}
        error={!!errors.pod_title}
        helperText={errors.pod_title?.message}
      />
      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ToggleButtonGroup
            exclusive
            fullWidth
            color="primary"
            value={field.value}
            onChange={(_e, next) => next && field.onChange(next)}
          >
            <ToggleButton value="PHYSICAL"><PlaceIcon fontSize="small" sx={{ mr: 1 }} /> Physical</ToggleButton>
            <ToggleButton value="VIRTUAL"><VideocamIcon fontSize="small" sx={{ mr: 1 }} /> Virtual</ToggleButton>
          </ToggleButtonGroup>
        )}
      />
      <Controller
        control={control}
        name="club_id"
        render={({ field }) => (
          <Autocomplete
            options={clubs}
            getOptionLabel={(option) => option.club_name}
            value={clubs.find((club) => club.id === field.value) ?? null}
            onChange={(_e, next) => {
              field.onChange(next?.id ?? '');
              setValue('venue_id', '');
            }}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Club"
                required
                error={!!errors.club_id}
                helperText={errors.club_id?.message ?? 'Search and select your club.'}
              />
            )}
          />
        )}
      />
      <TextField label="Hashtags" fullWidth placeholder="#weekend #community" {...register('pod_hashtag_text')} />
    </Stack>
  );
}
