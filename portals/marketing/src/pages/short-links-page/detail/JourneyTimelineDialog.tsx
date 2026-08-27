import { Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import { formatINR } from '@duncit/utils';
import { stepLabel } from './funnel-steps';
import { locationOf } from './clickColumns';
import type { ShortLinkJourneyRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  journey: ShortLinkJourneyRow | null;
  formatDateTime: (value: Date | string) => string;
  onClose: () => void;
}

/** One visitor's path through the funnel, in the order it happened. */
export default function JourneyTimelineDialog({
  journey,
  formatDateTime,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!journey) return null;

  const paid = journey.converted_amount;
  // The timeline stamps PAID once — it answers how FAR they got. This answers
  // how many times they paid, which the single stamp cannot.
  const payments = journey.conversions ?? [];

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h6" component="div" sx={{
          fontWeight: 700
        }}>
          {journey.user_name ?? 'Visitor who never signed in'}
        </Typography>
        {journey.user_email && (
          <Typography variant="body2" component="div" sx={{
            color: "text.secondary"
          }}>
            {journey.user_email}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
            }}
          >
            <InfoRow label={t('marketing.shortLinks.cameFrom')} value={journey.platform} />
            <InfoRow label={t('marketing.common.location')} value={locationOf(journey)} />
            <InfoRow label={t('marketing.shortLinks.device')} value={journey.device_type} />
            <InfoRow label={t('marketing.common.clicked')} value={formatDateTime(journey.clicked_at)} />
            <InfoRow label={t('marketing.shortLinks.gotAsFarAs')} value={stepLabel(journey.furthest_step)} />
            <InfoRow
              label={t('marketing.shortLinks.paid')}
              value={paid === null || paid === undefined ? EM_DASH : formatINR(paid)}
            />
          </Box>

          {payments.length > 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1
                }}>
                Payments
              </Typography>
              <Stack spacing={1.5}>
                {payments.map((payment) => (
                  <Stack
                    key={payment.payment_id}
                    direction="row"
                    spacing={1.5}
                    data-testid="conversion-row"
                    sx={{
                      alignItems: "center"
                    }}
                  >
                    <Chip size="small" color="success" label={formatINR(payment.amount)} />
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
                      {formatDateTime(payment.at)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 1
              }}>
              Timeline
            </Typography>
            {journey.steps.length === 0 && (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                This click never reported back — the visitor followed the link but the app never
                loaded, or they left before it did.
              </Typography>
            )}
            <Stack spacing={1.5}>
              {journey.steps.map((entry) => (
                <Stack
                  key={entry.step}
                  direction="row"
                  spacing={1.5}
                  data-testid="timeline-step"
                  sx={{
                    alignItems: "center"
                  }}
                >
                  <Chip
                    size="small"
                    label={stepLabel(entry.step)}
                    color={entry.step === 'PAID' ? 'success' : 'default'}
                  />
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    {formatDateTime(entry.at)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
