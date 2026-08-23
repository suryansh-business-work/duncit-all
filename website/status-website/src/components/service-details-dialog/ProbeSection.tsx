import { Alert, Box, Skeleton } from '@mui/material';
import { DetailRow, StatusPill } from './DetailRow';
import { useTranslation } from '../../i18n';
import { formatDate } from '../../utils/format';
import type { ProbeResult, SslInfo } from '../../types';

function SslRows({ ssl }: Readonly<{ ssl: SslInfo }>) {
  const { t } = useTranslation();
  const expiresOn = formatDate(ssl.validTo);
  const expiry =
    ssl.daysRemaining === null
      ? expiresOn
      : t('status.detail.sslExpiry', { vars: { date: expiresOn, days: ssl.daysRemaining } });
  const trustLabel = ssl.authorized
    ? t('status.detail.sslTrusted')
    : t('status.detail.sslUntrusted');
  return (
    <>
      <DetailRow
        label={t('status.detail.ssl')}
        value={<StatusPill ok={ssl.authorized} label={trustLabel} />}
      />
      <DetailRow label={t('status.detail.issuer')} value={ssl.issuer ?? '—'} />
      <DetailRow label={t('status.detail.subject')} value={ssl.subject ?? '—'} />
      <DetailRow label={t('status.detail.protocol')} value={ssl.protocol ?? '—'} />
      <DetailRow label={t('status.detail.validFrom')} value={formatDate(ssl.validFrom)} />
      <DetailRow label={t('status.detail.expires')} value={expiry} />
    </>
  );
}

interface ProbeSectionProps {
  probe: ProbeResult | null;
  error: string | null;
}

export default function ProbeSection({ probe, error }: Readonly<ProbeSectionProps>) {
  const { t } = useTranslation();
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!probe) {
    return (
      <Box>
        <Skeleton height={32} />
        <Skeleton height={32} />
        <Skeleton height={32} width="70%" />
      </Box>
    );
  }
  const codeLabel =
    probe.statusCode === null
      ? (probe.error ?? t('status.detail.unreachable'))
      : `${probe.statusCode} ${probe.statusText ?? ''}`.trim();
  return (
    <Box>
      <DetailRow
        label={t('status.detail.httpStatus')}
        value={<StatusPill ok={probe.ok} label={codeLabel} />}
      />
      {probe.ssl ? (
        <SslRows ssl={probe.ssl} />
      ) : (
        <DetailRow
          label={t('status.detail.ssl')}
          value={<StatusPill ok={false} label={t('status.detail.noCertificate')} />}
        />
      )}
    </Box>
  );
}
