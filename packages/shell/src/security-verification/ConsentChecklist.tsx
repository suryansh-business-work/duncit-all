import { Checkbox, FormControlLabel, FormGroup, FormHelperText, Paper, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import type { ConsentKey, ConsentState } from './useSecurityVerification';

interface Props {
  consent: ConsentState;
  onChange: (key: ConsentKey, value: boolean) => void;
  /** An administrator has approved another way, so no location is asked for. */
  locationNotNeeded: boolean;
  disabled: boolean;
}

/**
 * The four acknowledgements. Every box starts unticked and nothing here ticks
 * one for the person: each is a statement they make, in their own words.
 */
export function ConsentChecklist({ consent, onChange, locationNotNeeded, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const box = (key: ConsentKey, label: string, testId: string, off = false) => (
    <FormControlLabel
      key={key}
      data-testid={testId}
      disabled={disabled || off}
      control={<Checkbox checked={consent[key]} onChange={(event) => onChange(key, event.target.checked)} />}
      label={label}
      sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }}
    />
  );
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" component="h2" id="security-consent-title">
          {t('shell.securityVerification.consent.title')}
        </Typography>
        <FormGroup aria-labelledby="security-consent-title">
          {box('authorized_person', t('shell.securityVerification.consent.authorized'), 'security-consent-authorized')}
          {box('credentials_not_shared', t('shell.securityVerification.consent.credentials'), 'security-consent-credentials')}
          {box('policies_acknowledged', t('shell.securityVerification.consent.policies'), 'security-consent-policies')}
          {box('location_consent', t('shell.securityVerification.consent.location'), 'security-consent-location', locationNotNeeded)}
        </FormGroup>
        {locationNotNeeded && <FormHelperText>{t('shell.securityVerification.consent.locationNotNeeded')}</FormHelperText>}
      </Stack>
    </Paper>
  );
}
