import { Controller } from 'react-hook-form';
import { Box, Checkbox, FormControlLabel, FormHelperText, Link, Typography } from '@mui/material';
import type { CreatePodForm } from './create-pod.types';

/** Client-side publish gate — the host must accept the Organizer Terms before
 * the last step's "Create Pod" action validates. */
export default function TermsAgreement({ form }: Readonly<{ form: CreatePodForm }>) {
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
                inputProps={{ 'aria-label': 'Agree to Organizer Terms of Service' }}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                I agree to the{' '}
                <Link href="/policies/terms-of-service" target="_blank" rel="noreferrer" sx={{ fontWeight: 800 }}>
                  Organizer Terms of Service
                </Link>{' '}
                and confirm that I have the right to host this event at the selected venue.
              </Typography>
            }
          />
          {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
        </Box>
      )}
    />
  );
}
