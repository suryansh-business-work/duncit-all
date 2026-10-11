import { Box, Stack, Typography } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { DetailedTimelineStep, OrderScan } from '@duncit/utils';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

/** The dot a step wears, and the words a screen reader hears for it. */
function stepDot(step: DetailedTimelineStep) {
  if (step.current) {
    const stateKey = 'mweb.orderDetail.stepCurrent';
    // Where an order stopped: a failure in red, a cancellation muted.
    if (step.tone === 'failed') return { Icon: CancelIcon, color: 'error.main', stateKey };
    if (step.status === 'CANCELLED') return { Icon: CancelIcon, color: 'text.secondary', stateKey };
    if (step.tone === 'done') return { Icon: CheckCircleIcon, color: 'accent.main', stateKey };
    return { Icon: RadioButtonCheckedIcon, color: 'secondary.main', stateKey };
  }
  if (step.done) return { Icon: CheckCircleIcon, color: 'accent.main', stateKey: 'mweb.orderDetail.stepDone' };
  return { Icon: RadioButtonUncheckedIcon, color: 'text.secondary', stateKey: 'mweb.orderDetail.stepUpcoming' };
}

/** "Hyderabad Hub · Bag received" — whichever of the two the courier gave. */
const placeAndNote = (location: string, note: string) => [location, note].filter(Boolean).join(' · ');

const HIDDEN_SX = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
} as const;

function ScanRow({ scan }: Readonly<{ scan: OrderScan }>) {
  const { formatDateTime } = useDateFormat();
  const detail = placeAndNote(scan.location, scan.note);
  return (
    <Box component="li">
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {scan.at ? `${formatDateTime(scan.at)} · ` : ''}
        {scan.label}
        {detail ? ` · ${detail}` : ''}
      </Typography>
    </Box>
  );
}

interface Props {
  steps: DetailedTimelineStep[];
  testId?: string;
}

/**
 * The order's full tracking: every rung of the ladder with when it was reached,
 * and under it each courier scan — time, place and the courier's note. Ladder
 * order, first rung first. Native twin: components/order-detail/OrderDetailTimeline.
 */
export default function OrderDetailTimeline({ steps, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <Stack component="ol" spacing={0} data-testid={testId} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {steps.map((step, index) => {
        const { Icon, color, stateKey } = stepDot(step);
        const isLast = index === steps.length - 1;
        const reached = step.done || step.current;
        return (
          <Stack
            key={step.status}
            component="li"
            direction="row"
            spacing={1.25}
            aria-current={step.current ? 'step' : undefined}
            data-testid={`order-step-${step.status}`}
            sx={{ alignItems: 'stretch' }}
          >
            <Stack sx={{ alignItems: 'center' }} aria-hidden>
              <Icon sx={{ fontSize: 20, color }} />
              {!isLast && <Box sx={{ width: 2, flex: 1, minHeight: 16, my: 0.25, bgcolor: 'divider' }} />}
            </Stack>
            <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: step.current ? 700 : 500, color: reached ? 'text.primary' : 'text.secondary' }}>
                {step.label}
                <Box component="span" sx={HIDDEN_SX}>{` — ${t(stateKey)}`}</Box>
              </Typography>
              {step.at && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid={`order-step-at-${step.status}`}>
                  {formatDateTime(step.at)}
                </Typography>
              )}
              {step.scans.length === 0 && step.note && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{step.note}</Typography>
              )}
              {step.scans.length > 0 && (
                <Stack component="ul" spacing={0.25} sx={{ listStyle: 'none', m: 0, p: 0 }} data-testid={`order-step-scans-${step.status}`}>
                  {step.scans.map((scan) => (
                    // The server stores one scan per (time, label), so the pair is the scan's identity.
                    <ScanRow key={`${scan.at ?? 'untimed'}|${scan.label}|${scan.location}`} scan={scan} />
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
