import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  buildEarningsSplit,
  formatStatementMoney,
  type EarningsBucket,
  type EarningsBucketKey,
  type EarningsWaterfall,
} from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

const BUCKET_ICON: Record<EarningsBucketKey, SvgIconComponent> = {
  host: AccountBalanceWalletIcon,
  venue: StorefrontIcon,
  club: GroupsIcon,
  duncit: AccountBalanceIcon,
};

export interface EarningsSplitViewProps {
  /** The server waterfall — every figure is read off it, none computed here. */
  waterfall: EarningsWaterfall;
  /** Currency symbol, e.g. '₹'. */
  symbol: string;
  /** 'host' on the host's own pod ("Your Earning"); 'staff' in a portal. */
  viewer: 'host' | 'staff';
  /** Blocking reason pinned to the venue row (the pod cannot cover the slot). */
  venueError?: string | null;
}

/**
 * The one way a pod's money is shown on the web — mWeb Create Pod, Pod
 * Details in every portal, Finance and the complete-pod preview: the host's
 * earning first and strongest, then where the rest of the collection goes
 * (venue, club admin, Duncit & govt), each row opening its own breakdown.
 * Native twin: app/mobile-app create-pod/price-panel/EarningsSplitAccordion.
 */
export default function EarningsSplitView({
  waterfall,
  symbol,
  viewer,
  venueError,
}: Readonly<EarningsSplitViewProps>) {
  const { t } = useTranslation();
  const split = buildEarningsSplit(waterfall, { symbol, t, viewer });
  const money = (value: number) => formatStatementMoney(value, symbol);
  const [host, ...rest] = split.buckets;
  return (
    <Stack spacing={1} data-testid="earnings-split">
      {host && <BucketRow bucket={host} money={money} />}
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, pt: 0.5 }}>
        {t('earnings.split.heading')}
      </Typography>
      {rest.map((bucket) => (
        <BucketRow
          key={bucket.key}
          bucket={bucket}
          money={money}
          error={bucket.key === 'venue' ? venueError : null}
        />
      ))}
      {!split.reconciled && (
        <Alert severity="error" data-testid="earnings-split-reconcile-warning">
          {t('earnings.split.reconcileWarning')}
        </Alert>
      )}
    </Stack>
  );
}

function BucketRow({
  bucket,
  money,
  error,
}: Readonly<{ bucket: EarningsBucket; money: (n: number) => string; error?: string | null }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isHost = bucket.key === 'host';
  const Icon = BUCKET_ICON[bucket.key];
  return (
    <Accordion
      disableGutters
      expanded={open}
      slotProps={{ transition: { unmountOnExit: true } }}
      onChange={(_, next) => setOpen(next)}
      data-testid={`earnings-split-${bucket.key}`}
      sx={(theme) => ({
        borderRadius: 2,
        border: `${isHost || error ? 2 : 1}px solid`,
        borderColor: rowBorder(theme.palette, isHost, Boolean(error)),
        bgcolor: isHost ? alpha(theme.palette.success.main, 0.08) : 'action.hover',
        boxShadow: 'none',
        '&::before': { display: 'none' },
      })}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-label={bucket.title}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Icon color={isHost ? 'success' : 'primary'} fontSize={isHost ? 'medium' : 'small'} />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant={isHost ? 'subtitle1' : 'body2'} sx={{ fontWeight: 700 }}>
              {bucket.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('earnings.split.shareOfCollection', { vars: { pct: bucket.share_pct } })}
            </Typography>
            {/* In the summary, not the details: a blocking reason must stay
                visible while the row is collapsed. */}
            {error && (
              <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
                {error}
              </Typography>
            )}
          </Stack>
          <Typography
            variant={isHost ? 'h6' : 'body2'}
            sx={{ fontWeight: 700, color: isHost ? 'success.main' : 'text.primary', pr: 1 }}
          >
            {money(bucket.amount)}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: 'background.paper', mx: 0.5, mb: 0.5, borderRadius: 1.5 }}>
        <Stack spacing={1}>
          {bucket.lines.map((line) => (
            <Stack key={line.key} spacing={0.25} data-testid={`earnings-split-line-${line.key}`}>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2">{line.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {money(line.amount)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {line.formula}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function rowBorder(
  palette: { error: { main: string }; success: { main: string }; divider: string },
  isHost: boolean,
  invalid: boolean,
): string {
  if (invalid) return palette.error.main;
  return isHost ? palette.success.main : palette.divider;
}
