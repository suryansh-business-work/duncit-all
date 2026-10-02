import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Grid } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { FormActionsRow } from '@duncit/ui';
import {
  blankShortLinkValues,
  shortLinkSchema,
  type ShortLinkFormProps,
  type ShortLinkFormValues,
} from './short-link.types';
import ShortLinkUtmFields from './ShortLinkUtmFields';
import LinkPreviewSection from './LinkPreviewSection';

export {
  blankShortLinkValues,
  isAllowedDestination,
  isAllowedExternalDestination,
  shortLinkSchema,
  shortLinkValuesFrom,
  toShortLinkInput,
  toShortLinkUpdateInput,
} from './short-link.types';
import { useTranslation } from '@duncit/app-settings';

const DUNCIT_HINT = 'The page this link should open, e.g. https://mweb.duncit.com/club/…/pod/…';
const EXTERNAL_HINT =
  'The public https:// page this link should open, e.g. https://partner.example.com/offer';

export default function ShortLinkForm({
  utm,
  initialValues,
  lockDestination = false,
  submitLabel,
  busy,
  errorMessage,
  external = false,
  onCancel,
  onSubmit,
}: Readonly<ShortLinkFormProps>) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState, setValue } = useForm<ShortLinkFormValues, any, ShortLinkFormValues>({
    defaultValues: initialValues ?? blankShortLinkValues(),
    resolver: zodResolver(shortLinkSchema(t, external)) as unknown as Resolver<ShortLinkFormValues, any, ShortLinkFormValues>,
    mode: 'onChange',
  });

  const typedHint = external ? EXTERNAL_HINT : DUNCIT_HINT;
  const destinationHint = lockDestination ? t('marketing.shortLinks.shareDestinationLocked') : typedHint;

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
            disabled={lockDestination}
            hint={destinationHint}
          />
        </Grid>

        {utm && <ShortLinkUtmFields control={control} options={utm.options} campaigns={utm.campaigns} />}

        <LinkPreviewSection control={control} setValue={setValue} external={external} />

        <FormActionsRow
          errorMessage={errorMessage}
          busy={busy}
          disabled={!formState.isValid}
          submitLabel={submitLabel}
          secondaryAction={
            <DuncitButton onClick={onCancel} disabled={busy}>
              Cancel
            </DuncitButton>
          }
        />
      </Grid>
    </form>
  );
}
