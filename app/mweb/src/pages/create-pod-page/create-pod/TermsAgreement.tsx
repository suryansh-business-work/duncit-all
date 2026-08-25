import { Controller } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText, Link, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodForm } from './create-pod.types';

/** Client-side publish gate — the host must accept the Organizer Terms before
 * the last step's "Create Pod" action validates. */
export default function TermsAgreement({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={form.control}
      name="agreed_to_terms"
      render={({ field, fieldState }) => (
        <Box>
          <FormControlLabel
            sx={{ alignItems: 'flex-start', m: 0 }}
            control={
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                sx={{ pt: 0.25 }}
                slotProps={{
                  input: { 'aria-label': t('mweb.createPod.termsAria') }
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {t('mweb.createPod.termsLeadIn')}{' '}
                <Link href="/policies/terms-of-service" target="_blank" rel="noreferrer" sx={{ fontWeight: 600 }}>
                  {t('mweb.createPod.termsLink')}
                </Link>{' '}
                {t('mweb.createPod.termsTail')}
              </Typography>
            }
          />
          {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
        </Box>
      )}
    />
  );
}
