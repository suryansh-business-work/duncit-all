import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Grid, MenuItem, Stack } from '@mui/material';
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

const NO_CAMPAIGN = '';

export default function ShortLinkForm({
  options,
  campaigns,
  busy,
  errorMessage,
  onCancel,
  onSubmit,
}: Readonly<ShortLinkFormProps>) {
  const { control, handleSubmit, formState } = useForm<ShortLinkFormValues>({
    defaultValues: blankShortLinkValues(),
    resolver: zodResolver(shortLinkSchema),
    mode: 'onChange',
  });

  const source = useWatch({ control, name: 'source' });
  const medium = useWatch({ control, name: 'medium' });

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RhfTextField
            control={control}
            name="label"
            label="Label"
            required
            hint="What this link is for, so you can find it later"
          />
        </Grid>
        <Grid item xs={12}>
          <RhfTextField
            control={control}
            name="destination_url"
            label="Destination"
            required
            hint="The page this link should open, e.g. https://mweb.duncit.com/club/…/pod/…"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <RhfTextField control={control} name="source" label="Link creating for" select required>
            {options.sources.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        {source === 'OTHER' && (
          <Grid item xs={12} sm={6}>
            <RhfTextField
              control={control}
              name="source_other"
              label="Which channel?"
              required
              hint="Becomes the utm_source"
            />
          </Grid>
        )}

        <Grid item xs={12} sm={6}>
          <RhfTextField control={control} name="medium" label="Medium" select required>
            {options.mediums.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>
        {medium === 'OTHER' && (
          <Grid item xs={12} sm={6}>
            <RhfTextField
              control={control}
              name="medium_other"
              label="Which medium?"
              required
              hint="Becomes the utm_medium"
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <RhfTextField
            control={control}
            name="campaign_id"
            label="Campaign"
            select
            hint="Optional — tags the link with utm_campaign"
          >
            <MenuItem value={NO_CAMPAIGN}>No campaign</MenuItem>
            {campaigns.map((campaign) => (
              <MenuItem key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.name}
              </MenuItem>
            ))}
          </RhfTextField>
        </Grid>

        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy || !formState.isValid}>
              {busy ? 'Creating…' : 'Create link'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
