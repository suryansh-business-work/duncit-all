import { Controller, type Control } from 'react-hook-form';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import RhfTextField from '../../forms/components/RhfTextField';
import PhoneExtensionField from '../../components/PhoneExtensionField';
import type { InterviewDetailsValues } from './interview-booking';
import { useTranslation } from '../../i18n/useTranslation';

interface InterviewDetailsFormProps {
  isHost: boolean;
  /** react-hook-form control from the page's `useForm`. */
  control: Control<InterviewDetailsValues>;
}

/**
 * The applicant's details — React Hook Form + Zod (rule 10).
 *
 * Every box reports its own refusal underneath itself as it is typed into. It
 * used to be twelve `useState` pairs validated once on Submit into a single
 * alert at the top of the page, which said nothing about which box was wrong.
 */
export default function InterviewDetailsForm({
  isHost,
  control,
}: Readonly<InterviewDetailsFormProps>) {
  const { t } = useTranslation();
  const aboutLabel = isHost ? 'Why do you want to be a host?' : 'Tell us about your venue';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Your details
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField
              control={control}
              name="applicant_name"
              label={t('mweb.interviewBooking.fullName')}
              required
            />
            <RhfTextField
              control={control}
              name="applicant_email"
              label={t('mweb.common.email')}
              type="email"
              required
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <Controller
              control={control}
              name="applicant_phone_extension"
              render={({ field }) => (
                <PhoneExtensionField
                  value={field.value}
                  onChange={field.onChange}
                  label={t('mweb.common.code')}
                  size="medium"
                />
              )}
            />
            <RhfTextField
              control={control}
              name="applicant_phone_number"
              label={t('mweb.common.phone')}
              type="tel"
              required
              // Digits are a property of the box, not a message after the fact:
              // a paste and an autofill are how letters get into a phone field.
              digitsOnly
              slotProps={{
                htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength: 15 },
              }}
            />
          </Stack>
          {!isHost && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <RhfTextField
                control={control}
                name="business_name"
                label={t('mweb.interviewBooking.venueName')}
              />
              <RhfTextField
                control={control}
                name="business_address"
                label={t('mweb.interviewBooking.venueAddress')}
              />
            </Stack>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <RhfTextField control={control} name="city" label={t('mweb.common.city')} />
            <RhfTextField
              control={control}
              name="zone"
              label={t('mweb.interviewBooking.zoneArea')}
            />
          </Stack>
          <RhfTextField
            control={control}
            name="about"
            label={aboutLabel}
            required
            multiline
            minRows={4}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
