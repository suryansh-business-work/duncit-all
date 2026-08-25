import { useWatch, type Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import {
  audienceOptions,
  type AppPopupFormValues,
  type AudienceListOption,
} from './app-popup.types';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  const audienceType = useWatch({ control, name: 'audience_type' });

  return (
    <Grid container spacing={2}>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          control={control}
          name="audience_type"
          label={t('marketing.common.targetAudience')}
          select
          required
          hint="Everyone, or a saved list"
        >
          {audienceOptions(t).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>

      {audienceType === 'AUDIENCE_LIST' && (
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField
            control={control}
            name="audience_list_id"
            label={t('marketing.common.audienceList')}
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

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          control={control}
          name="cta_label"
          label={t('marketing.appPopups.ctaButtonLabel')}
          hint="Optional — e.g. Shop now"
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          control={control}
          name="cta_url"
          label={t('marketing.appPopups.ctaLink')}
          hint="Optional — https://… or an in-app path like /earn"
        />
      </Grid>
    </Grid>
  );
}
