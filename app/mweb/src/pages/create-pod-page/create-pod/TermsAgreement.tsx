import { Controller } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText, Link, Typography } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import { useBrandingAssets } from '../../../hooks/useBrandingAssets';
import type { CreatePodForm } from './create-pod.types';

/** Client-side publish gate — the host must accept the Organizer Terms before
 * the last step's "Create Pod" action validates. The terms link is the admin
 * Branding Terms page, the same one the sign-in screens link to. */
export default function TermsAgreement({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const { termsUrl } = useBrandingAssets();
  return (
    <Controller
      control={form.control}
      name="agreed_to_terms"
      render={({ field, fieldState }) => (
        <Box data-testid="create-pod-terms">
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
                <Link data-testid="terms-link" href={termsUrl} target="_blank" rel="noreferrer" sx={{ fontWeight: 600 }}>
                  {t('mweb.createPod.termsLink')}
                </Link>{' '}
                {t('mweb.createPod.termsTail')}
              </Typography>
            }
          />
          {fieldState.error && <FormHelperText data-testid="agreed_to_terms-error" error>{fieldState.error.message}</FormHelperText>}
        </Box>
      )}
    />
  );
}
