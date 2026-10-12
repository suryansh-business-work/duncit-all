import { Divider, Stack, Typography } from '@mui/material';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { ReleaseKindChip } from '../ReleaseStatusChip';
import { money } from '../../pod-finance-page/queries';
import type { PaymentReleaseRow } from '../queries';

interface Props {
  releases: readonly PaymentReleaseRow[];
  symbol: string;
  /** Opens the single-payout review (approve in part, or reject with a reason). */
  onReview: (release: PaymentReleaseRow) => void;
}

/**
 * Every payout one pod's request asks for — host, venue, club admin, product
 * sellers — with who it goes to, how much, and where it stands. A pending one
 * can be reviewed by itself; "Approve all payouts" on the page takes the rest.
 */
export default function ReleasePayoutList({ releases, symbol, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack component="ul" spacing={1.5} divider={<Divider flexItem />} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {releases.map((release) => (
        <Stack
          key={release.id}
          component="li"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          data-testid={`release-payout-${release.kind}`}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <ReleaseKindChip kind={release.kind} />
              <StatusChip status={release.status} fallbackColor="warning" />
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {release.beneficiary_name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
              {release.beneficiary_email} · {release.release_id}
            </Typography>
          </Stack>
          <Stack sx={{ alignItems: { sm: 'flex-end' } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {money(symbol, release.amount_requested)}
            </Typography>
            {release.status === 'APPROVED' && release.approved_amount != null && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('finance.paymentRelease.approvedAmount')}: {money(symbol, release.approved_amount)}
              </Typography>
            )}
          </Stack>
          {release.status === 'PENDING' && (
            <DuncitButton size="small" startIcon={<RateReviewIcon />} onClick={() => onReview(release)}>
              {t('finance.paymentRelease.review')}
            </DuncitButton>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
