import { Alert, Box, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { ConsentChecklist } from './ConsentChecklist';
import { DetectedDetails } from './DetectedDetails';
import { LocationPanel } from './LocationPanel';
import { PolicySections } from './PolicySections';
import { SecurityWarningBanner } from './SecurityWarningBanner';
import { useSecurityVerification } from './useSecurityVerification';

interface Props {
  /** The console's name, for the heading ("Duncit Finance"). */
  portalName: string;
  /** Ends the sign-in: the way out for anyone who should not be here. */
  onSignOut: () => void;
  /** Overrides what happens once verified; defaults to reloading at the same address. */
  onVerified?: () => void;
}

/**
 * Security Verification & Location Tracking — the screen between a console
 * sign-in and the console.
 *
 * It sits in front of the whole console (see PortalSecurityGate), so a deep
 * link, a bookmark or a restored tab all meet it at the address they asked for,
 * and finishing it lands them back on exactly that address. It is not the
 * security control — the server refuses the sign-in token everywhere until this
 * is completed — and it replaces none of the role checks or two-step
 * verification that came before it.
 */
export function SecurityVerificationScreen({ portalName, onSignOut, onVerified }: Readonly<Props>) {
  const { t } = useTranslation();
  const v = useSecurityVerification({ onVerified });
  const { challenge } = v;

  if (v.loading && !challenge) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} role="status" aria-label={t('shell.securityVerification.loading')}>
        <CircularProgress />
      </Box>
    );
  }

  if (!challenge) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack spacing={2} data-testid="security-load-failed">
          <Alert severity="error" role="alert">
            {v.loadError ?? t('shell.securityVerification.loadFailed')}
          </Alert>
          <Stack direction="row" spacing={1}>
            <DuncitButton variant="contained" onClick={() => v.reload()}>
              {t('shell.securityVerification.retry')}
            </DuncitButton>
            <DuncitButton onClick={onSignOut}>{t('shell.securityVerification.signOut')}</DuncitButton>
          </Stack>
        </Stack>
      </Container>
    );
  }

  const whyBlocked = (() => {
    if (v.blockers.acknowledgements) return t('shell.securityVerification.blocked.acknowledgements');
    if (v.blockers.location) return t('shell.securityVerification.blocked.location');
    return null;
  })();

  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 2, sm: 4 } }}>
      <Container maxWidth="md" sx={{ px: 2 }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h5" component="h1">
              {t('shell.securityVerification.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('shell.securityVerification.subtitle', { vars: { portal: portalName } })}
            </Typography>
          </Stack>
          {challenge.reverify && (
            <Alert severity="info" data-testid="security-reverify">
              {t('shell.securityVerification.reverify')}
            </Alert>
          )}
          <SecurityWarningBanner />
          <DetectedDetails detected={challenge.detected} userName={challenge.user_name} />
          <LocationPanel
            status={v.geo.status}
            fix={v.geo.fix}
            onRequest={v.geo.request}
            exception={v.alternative.exception}
            alternativeBusy={v.alternative.requesting}
            alternativeError={v.alternative.error}
            onRequestAlternative={v.alternative.request}
          />
          <PolicySections sections={challenge.sections} links={challenge.links} />
          <ConsentChecklist
            consent={v.consent}
            onChange={v.setConsent}
            locationNotNeeded={v.usingException}
            disabled={v.submitting}
          />
          {v.submitError && (
            <Alert severity="error" role="alert" data-testid="security-submit-error">
              {v.submitError}
            </Alert>
          )}
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <DuncitButton
                variant="contained"
                size="large"
                onClick={v.submit}
                disabled={!v.canProceed}
                aria-describedby={whyBlocked ? 'security-proceed-hint' : undefined}
                data-testid="security-proceed"
              >
                {v.submitting
                  ? t('shell.securityVerification.proceeding')
                  : t('shell.securityVerification.proceed')}
              </DuncitButton>
              <DuncitButton size="large" onClick={onSignOut} disabled={v.submitting} data-testid="security-sign-out">
                {t('shell.securityVerification.signOut')}
              </DuncitButton>
            </Stack>
            {whyBlocked && (
              <Typography id="security-proceed-hint" variant="caption" sx={{ color: 'text.secondary' }}>
                {whyBlocked}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('shell.securityVerification.signOutHint')}
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
