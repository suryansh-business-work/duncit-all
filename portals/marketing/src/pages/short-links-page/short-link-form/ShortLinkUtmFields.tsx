import { useWatch, type Control } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { CampaignChoice, ShortLinkOptions } from '../queries';
import type { ShortLinkFormValues } from './short-link.types';

const NO_CAMPAIGN = '';

interface Props {
  control: Control<ShortLinkFormValues>;
  options: ShortLinkOptions;
  campaigns: CampaignChoice[];
}

/** Channel, medium and campaign — the utm tags a new link goes out with. */
export default function ShortLinkUtmFields({ control, options, campaigns }: Readonly<Props>) {
  const { t } = useTranslation();
  const source = useWatch({ control, name: 'source' });
  const medium = useWatch({ control, name: 'medium' });

  return (
    <>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField control={control} name="source" label={t('marketing.shortLinks.linkCreatingFor')} select required>
          {options.sources.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      {source === 'OTHER' && (
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField
            control={control}
            name="source_other"
            label={t('marketing.shortLinks.whichChannel')}
            required
            hint="Becomes the utm_source"
          />
        </Grid>
      )}

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField control={control} name="medium" label={t('marketing.shortLinks.medium')} select required>
          {options.mediums.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      {medium === 'OTHER' && (
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <RhfTextField
            control={control}
            name="medium_other"
            label={t('marketing.shortLinks.whichMedium')}
            required
            hint="Becomes the utm_medium"
          />
        </Grid>
      )}

      <Grid size={12}>
        <RhfTextField
          control={control}
          name="campaign_id"
          label={t('marketing.common.campaign')}
          select
          hint="Optional — tags the link with utm_campaign"
        >
          <MenuItem value={NO_CAMPAIGN}>{t('marketing.shortLinks.noCampaign')}</MenuItem>
          {campaigns.map((campaign) => (
            <MenuItem key={campaign.campaign_id} value={campaign.campaign_id}>
              {campaign.name}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
    </>
  );
}
