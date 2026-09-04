import { Alert, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { PodChangeCandidateRow } from '@duncit/pod-change-requests';
import type { PodChangeRole } from '@duncit/utils';

/** One contact line with its icon. Hoisted so it is never redefined (S6478). */
function ContactLine({
  icon,
  value,
}: Readonly<{ icon: React.ReactNode; value: string }>) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption">{value}</Typography>
    </Stack>
  );
}

interface Props {
  rows: readonly PodChangeCandidateRow[];
  role: PodChangeRole;
  loading: boolean;
  busy: boolean;
  onPick: (row: PodChangeCandidateRow) => void;
}

/**
 * The partners this pod may be offered to, each with the contacts an admin
 * needs before asking.
 *
 * Cards rather than a table on purpose: the whole point of the drawer is to
 * decide WHO to ring, and a phone number in a 90px column is not readable.
 * A VENUE row continues to the slot picker; the other two send the offer
 * straight away, because there is nothing left to choose.
 */
export default function CandidateList({
  rows,
  role,
  loading,
  busy,
  onPick,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={92} />
        <Skeleton variant="rounded" height={92} />
      </Stack>
    );
  }

  if (rows.length === 0) {
    return <Alert severity="warning">{t('admin.changeRequests.noCandidates')}</Alert>;
  }

  const cta = role === 'VENUE'
    ? t('admin.changeRequests.colSlot')
    : t('admin.changeRequests.sendRequest');

  return (
    <Stack spacing={1}>
      {rows.map((row) => (
        <Card key={row.id} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                  {row.label}
                </Typography>
                {row.detail && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                    {row.detail}
                  </Typography>
                )}
                <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                  <ContactLine icon={<PhoneIcon sx={{ fontSize: 14 }} />} value={row.phone} />
                  <ContactLine icon={<EmailIcon sx={{ fontSize: 14 }} />} value={row.email} />
                </Stack>
              </Stack>
              <DuncitButton
                variant="contained"
                size="small"
                disabled={busy}
                onClick={() => onPick(row)}
                sx={{ flexShrink: 0 }}
              >
                {cta}
              </DuncitButton>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
