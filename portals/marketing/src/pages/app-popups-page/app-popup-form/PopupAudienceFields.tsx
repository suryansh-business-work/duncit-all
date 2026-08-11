import { useWatch, type Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import {
  AUDIENCE_OPTIONS,
  type AppPopupFormValues,
  type AudienceListOption,
} from './app-popup.types';

interface Props {
  control: Control<AppPopupFormValues>;
  audienceLists: AudienceListOption[];
}

/**
 * Who sees the popup, and where it sends them.
 *
 * The audience is a saved Target Audience list rather than filters typed in
 * here: the list is a live segment, so a popup aimed at one keeps reaching the
 * people who match it today, not the ones who matched when it was written.
 */
export default function PopupAudienceFields({ control, audienceLists }: Readonly<Props>) {
  const audienceType = useWatch({ control, name: 'audience_type' });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="audience_type"
          label="Target audience"
          select
          required
          hint="Everyone, or a saved list"
        >
          {AUDIENCE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>

      {audienceType === 'AUDIENCE_LIST' && (
        <Grid item xs={12} sm={6}>
          <RhfTextField
            control={control}
            name="audience_list_id"
            label="Audience list"
            select
            required
            hint="Built in Target Audience"
          >
            {audienceLists.map((list) => (
              <MenuItem key={list.id} value={list.id}>
                {list.name} · {list.member_count} people
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
      )}

      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="cta_label"
          label="CTA button label"
          hint="Optional — e.g. Shop now"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="cta_url"
          label="CTA link"
          hint="Optional — https://… or an in-app path like /earn"
        />
      </Grid>
    </Grid>
  );
}
