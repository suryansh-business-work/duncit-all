import { useForm, useWatch , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Grid, MenuItem, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import {
  blankShortLinkValues,
  shortLinkSchema,
  type ShortLinkFormProps,
  type ShortLinkFormValues,
} from './short-link.types';

export {
  blankShortLinkValues,
  isAllowedDestination,
  shortLinkSchema,
  toShortLinkInput,
} from './short-link.types';
import { useTranslation } from '@duncit/app-settings';

const NO_CAMPAIGN = '';

export default function ShortLinkForm({
  options,
  campaigns,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<ShortLinkFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm<ShortLinkFormValues, any, ShortLinkFormValues>({
    defaultValues: blankShortLinkValues(),
    resolver: zodResolver(shortLinkSchema(t)) as unknown as Resolver<ShortLinkFormValues, any, ShortLinkFormValues>,
    mode: 'onChange',
  });

  const source = useWatch({ control, name: 'source' });
  const medium = useWatch({ control, name: 'medium' });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="label"
            label={t('marketing.shortLinks.label')}
            required
            hint="What this link is for, so you can find it later"
          />
        </Grid>
        <Grid size={12}>
          <RhfTextField
            control={control}
            name="destination_url"
            label={t('marketing.common.destination')}
            required
            hint="The page this link should open, e.g. https://mweb.duncit.com/club/…/pod/…"
          />
        </Grid>

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

        {errorMessage && (
          <Grid size={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}

        <Grid size={12}>
          <Stack direction="row" spacing={1} sx={{
            justifyContent: "flex-end"
          }}>
            <DuncitButton onClick={onCancel} disabled={busy}>
              Cancel
            </DuncitButton>
            <DuncitButton type="submit" variant="contained" disabled={busy || !formState.isValid}>
              {busy ? 'Creating…' : 'Create link'}
            </DuncitButton>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
