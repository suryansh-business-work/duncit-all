import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { useTranslation } from '../../../i18n/useTranslation';
import { STATUS_CHIP } from '../statusChip';
import type { PodHistoryItem } from '../queries';

interface Props {
  item: PodHistoryItem;
  imageUrl: string | undefined;
  statusLabel: string;
  refundText: string;
  showRefundState: boolean;
  coinsRefunded: number;
  dateText: string;
  priceCaption: string;
}

/** The booking's cover, status chips, title, date and price. */
export default function PodHistorySummaryCard({
  item,
  imageUrl,
  statusLabel,
  refundText,
  showRefundState,
  coinsRefunded,
  dateText,
  priceCaption,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const pod = item.pod;
  return (
    /* The tour's first step. It lives here and not on the history LIST
        because the ticket and back-out controls only exist on this page — and
        a tour that resolves on the list would open there, one step long, and
        record itself as shown. */
    <Card data-tour="booking-summary" data-testid="ph-summary-card">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
          alignItems: { sm: 'center' }
        }}>
          <Avatar alt="" src={imageUrl || undefined} variant="rounded" sx={{ width: { xs: '100%', sm: 96 }, height: { xs: 140, sm: 96 }, borderRadius: '18px', bgcolor: 'action.hover', color: 'text.secondary' }}>
            <EventIcon />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 0.75,
                flexWrap: 'wrap'
              }}>
              {/* "Visited" once the pod has happened — "Joined" is a promise
                  about something still ahead. */}
              <Chip size="small" color={STATUS_CHIP[item.status].color} label={statusLabel} data-testid="ph-status-chip" />
              {/* No refund state at all unless one is actually in play, and
                  the word comes from the request rather than the booking —
                  the booking's own copy is never written for a partial. */}
              {showRefundState && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t('mweb.podHistory.refundChip', { vars: { status: refundText } })}
                  data-testid="ph-refund-chip"
                />
              )}
              {coinsRefunded > 0 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${t('mweb.coin.refundCoins')}: ${coinsRefunded}`}
                  data-testid="ph-coins-chip"
                />
              )}
              {(item.seats ?? 1) > 1 && (
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={t('mweb.podHistory.seatsChip', { vars: { count: item.seats ?? 1 } })}
                  data-testid="ph-seats-chip"
                />
              )}
            </Stack>
            <Typography data-testid="ph-summary-title" sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.25 }}>
              {pod?.pod_title ?? t('mweb.podHistory.podDetailsTitle')}
            </Typography>
            <Typography variant="body2" data-testid="ph-summary-date" sx={{
              color: "text.secondary"
            }}>
              {dateText}
            </Typography>
            <Typography variant="caption" data-testid="ph-summary-price" sx={{
              color: "text.secondary"
            }}>
              {priceCaption}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
