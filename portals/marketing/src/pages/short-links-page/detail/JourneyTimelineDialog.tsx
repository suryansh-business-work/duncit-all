import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { InfoRow } from '@duncit/ui';
import { formatINR } from '@duncit/utils';
import { stepLabel } from './funnel-steps';
import { locationOf } from './clickColumns';
import type { ShortLinkJourneyRow } from '../queries';

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
  if (!journey) return null;

  const paid = journey.converted_amount;

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h6" component="div" fontWeight={700}>
          {journey.user_name ?? 'Visitor who never signed in'}
        </Typography>
        {journey.user_email && (
          <Typography variant="body2" component="div" color="text.secondary">
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
            <InfoRow label="Came from" value={journey.platform} />
            <InfoRow label="Location" value={locationOf(journey)} />
            <InfoRow label="Device" value={journey.device_type} />
            <InfoRow label="Clicked" value={formatDateTime(journey.clicked_at)} />
            <InfoRow label="Got as far as" value={stepLabel(journey.furthest_step)} />
            <InfoRow
              label="Paid"
              value={paid === null || paid === undefined ? EM_DASH : formatINR(paid)}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Timeline
            </Typography>
            {journey.steps.length === 0 && (
              <Typography variant="body2" color="text.secondary">
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
                  alignItems="center"
                  data-testid="timeline-step"
                >
                  <Chip
                    size="small"
                    label={stepLabel(entry.step)}
                    color={entry.step === 'PAID' ? 'success' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(entry.at)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
