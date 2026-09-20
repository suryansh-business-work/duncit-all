import { Alert, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { BrandConsent } from '../queries';

interface Props {
  consent: BrandConsent;
}

type Translate = ReturnType<typeof useTranslation>['t'];

interface ConsentNotice {
  severity: 'info' | 'warning' | 'success';
  text: string;
}

const DASH = '—';

/** Unavailable → nothing to sign yet; unsigned; signed against old wording; signed. */
const consentNotice = (consent: BrandConsent, t: Translate, signedLine: string): ConsentNotice => {
  if (!consent.available) return { severity: 'info', text: t('products.brandReview.consentUnavailable') };
  if (!consent.accepted) return { severity: 'warning', text: t('products.brandReview.consentUnsigned') };
  if (!consent.current) return { severity: 'warning', text: t('products.brandReview.consentOutdated') };
  return { severity: 'success', text: signedLine };
};

export default function BrandConsentPanel({ consent }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const signedLine = t('products.brandReview.consentSigned', {
    vars: { name: consent.signed_name, when: consent.signed_at ? formatDateTime(consent.signed_at) : DASH },
  });
  const notice = consentNotice(consent, t, signedLine);
  // An outdated signature still names who signed and when — that record is
  // what the partner is asked to renew, not something to hide.
  const showSignedLine = consent.accepted && !consent.current;
  return (
    <Stack spacing={1.5} data-testid="brand-consent-panel">
      <Alert severity={notice.severity}>{notice.text}</Alert>
      {showSignedLine && <Typography variant="body2">{signedLine}</Typography>}
      {consent.available && (
        <InfoRow label={t('shell.common.title')} value={consent.policy_title || DASH} />
      )}
      {consent.content_hash && (
        <InfoRow
          label={t('products.brandReview.consentHash')}
          value={consent.content_hash}
          valueSx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
        />
      )}
    </Stack>
  );
}
