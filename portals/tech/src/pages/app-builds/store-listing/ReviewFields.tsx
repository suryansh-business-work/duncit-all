import { Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { Controller, type Control } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { LISTING_LIMITS, type StoreListingValues } from './store-listing.types';

interface Props {
  control: Control<StoreListingValues>;
}

/**
 * Who the stores may contact, and how App Review signs in. The demo account is
 * the one Apple's reviewer actually uses: it has to work with a password or a
 * fixed code, because nobody at Apple receives a live WhatsApp OTP.
 */
export default function ReviewFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} data-testid="store-listing-review">
      <Typography variant="subtitle2">{t('tech.storeListing.sectionShared')}</Typography>
      <RhfTextField
        control={control}
        name="contact_email"
        label={t('tech.storeListing.contactEmail')}
        hint={t('tech.storeListing.contactEmailHint')}
        type="email"
      />
      <RhfTextField
        control={control}
        name="contact_phone"
        label={t('tech.storeListing.contactPhone')}
        hint={t('tech.storeListing.contactPhoneHint')}
        type="tel"
      />
      <Typography variant="subtitle2">{t('tech.storeListing.sectionApple')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="review_first_name" label={t('tech.storeListing.reviewFirstName')} />
        <RhfTextField control={control} name="review_last_name" label={t('tech.storeListing.reviewLastName')} />
      </Stack>
      <Controller
        control={control}
        name="demo_account_required"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                slotProps={{ input: { 'aria-label': t('tech.storeListing.demoAccountRequired') } }}
                data-testid="store-listing-demo-account-required"
              />
            }
            label={t('tech.storeListing.demoAccountRequired')}
          />
        )}
      />
      <RhfTextField
        control={control}
        name="demo_account_name"
        label={t('tech.storeListing.demoAccountName')}
        hint={t('tech.storeListing.demoAccountNameHint')}
        autoComplete="off"
      />
      <RhfTextField
        control={control}
        name="demo_account_password"
        label={t('tech.storeListing.demoAccountPassword')}
        type="password"
        autoComplete="new-password"
      />
      <RhfTextField
        control={control}
        name="review_notes"
        label={t('tech.storeListing.reviewNotes')}
        hint={t('tech.storeListing.reviewNotesHint', { vars: { max: String(LISTING_LIMITS.review_notes) } })}
        multiline
        minRows={4}
      />
    </Stack>
  );
}
