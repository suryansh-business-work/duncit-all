import { Alert, Box, Stack } from '@mui/material';
import { hostAgainNoticeKeys } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { HostAgainPrefill } from './useHostAgainPrefill';

interface Props {
  prefill: HostAgainPrefill;
  /** The pod's city when it is not the header's — said so the host is not surprised. */
  otherCityName: string | null;
}

/**
 * Above a Host Again form: where it was copied from, a pod city other than the
 * header's, and anything that could not be carried over (each naming the step
 * to fix it on). Native twin: create-pod/HostAgainNotice (rule 27).
 */
export default function HostAgainNotice({ prefill, otherCityName }: Readonly<Props>) {
  const { t } = useTranslation();
  const warnings = hostAgainNoticeKeys(prefill.notices);
  return (
    <Stack spacing={1} data-testid="create-pod-host-again" aria-live="polite">
      <Alert severity="info" data-testid="create-pod-host-again-source">
        {t('mweb.createPod.hostAgain.copiedFrom', { vars: { title: prefill.source_title } })}
        {otherCityName && (
          <Box component="span" sx={{ display: 'block', mt: 0.5 }} data-testid="create-pod-host-again-city">
            {t('mweb.createPod.hostAgain.otherCity', { vars: { city: otherCityName } })}
          </Box>
        )}
      </Alert>
      {warnings.length > 0 && (
        <Alert severity="warning" data-testid="create-pod-host-again-warnings">
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {warnings.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </Box>
        </Alert>
      )}
    </Stack>
  );
}
