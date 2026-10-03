import type { ReactNode } from 'react';
import { Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { SslCertificate } from '@duncit/gql-types';
import { COVERAGE_KEY } from './expiry';
import SslLiveCheckList from './SslLiveCheckList';

const EM_DASH = '—';
const MONO = { fontFamily: 'monospace', wordBreak: 'break-all' } as const;

interface Props {
  /** The certificate to show; null closes the dialog. */
  cert: SslCertificate | null;
  onClose: () => void;
}

/** Everything certbot and the certificate itself say about one lineage, then what each host serves. */
export default function SslCertificateDialog({ cert, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!cert) return null;

  const rows: Array<[string, string, ReactNode]> = [
    ['common-name', t('tech.ssl.commonName'), cert.common_name ?? EM_DASH],
    ['issuer', t('tech.ssl.colIssuer'), cert.issuer ?? EM_DASH],
    ['key-type', t('tech.ssl.colKeyType'), cert.key_type],
    ['coverage', t('tech.ssl.colCoverage'), t(COVERAGE_KEY[cert.coverage])],
    ['valid-from', t('tech.ssl.validFrom'), formatDateTime(cert.valid_from)],
    ['valid-to', t('tech.ssl.colExpires'), formatDateTime(cert.valid_to)],
    ['renews-from', t('tech.ssl.colRenewsFrom'), formatDateTime(cert.renewal_due_at)],
    ['authenticator', t('tech.ssl.authenticator'), cert.authenticator ?? EM_DASH],
    ['installer', t('tech.ssl.installer'), cert.installer ?? EM_DASH],
    [
      'ca',
      t('tech.ssl.caEnvironment'),
      <Chip
        key="ca"
        size="small"
        color={cert.production_ca ? 'success' : 'error'}
        label={cert.production_ca ? t('tech.ssl.caProduction') : t('tech.ssl.caStaging')}
      />,
    ],
    ['serial', t('tech.ssl.serial'), <Typography key="serial" variant="body2" sx={MONO}>{cert.serial_number}</Typography>],
    [
      'fingerprint',
      t('tech.ssl.fingerprint'),
      <Typography key="fp" variant="body2" sx={MONO}>{cert.fingerprint_sha256}</Typography>,
    ],
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="ssl-dialog-title">
      <DialogTitle id="ssl-dialog-title">{cert.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {rows.map(([id, label, value]) => (
            <InfoRow key={id} variant="split" label={label} value={value} testId={`ssl-${id}`} />
          ))}
        </Stack>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mt: 3 }}>
          {t('tech.ssl.liveTitle')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {t('tech.ssl.liveSubtitle')}
        </Typography>
        <SslLiveCheckList name={cert.name} />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
