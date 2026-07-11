import { Alert, Box, Skeleton } from '@mui/material';
import { DetailRow, StatusPill } from './DetailRow';
import { formatDate } from '../../utils/format';
import type { ProbeResult, SslInfo } from '../../types';

function SslRows({ ssl }: Readonly<{ ssl: SslInfo }>) {
  const expiresOn = formatDate(ssl.validTo);
  const expiry =
    ssl.daysRemaining !== null ? `${expiresOn} · ${ssl.daysRemaining} days left` : expiresOn;
  const trustLabel = ssl.authorized ? 'Valid & trusted' : 'Not trusted';
  return (
    <>
      <DetailRow label="SSL" value={<StatusPill ok={ssl.authorized} label={trustLabel} />} />
      <DetailRow label="Issuer" value={ssl.issuer ?? '—'} />
      <DetailRow label="Subject" value={ssl.subject ?? '—'} />
      <DetailRow label="Protocol" value={ssl.protocol ?? '—'} />
      <DetailRow label="Valid from" value={formatDate(ssl.validFrom)} />
      <DetailRow label="Expires" value={expiry} />
    </>
  );
}

interface ProbeSectionProps {
  probe: ProbeResult | null;
  error: string | null;
}

export default function ProbeSection({ probe, error }: Readonly<ProbeSectionProps>) {
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
    probe.statusCode !== null
      ? `${probe.statusCode} ${probe.statusText ?? ''}`.trim()
      : (probe.error ?? 'Unreachable');
  return (
    <Box>
      <DetailRow label="HTTP status" value={<StatusPill ok={probe.ok} label={codeLabel} />} />
      {probe.ssl ? (
        <SslRows ssl={probe.ssl} />
      ) : (
        <DetailRow label="SSL" value={<StatusPill ok={false} label="No certificate" />} />
      )}
    </Box>
  );
}
