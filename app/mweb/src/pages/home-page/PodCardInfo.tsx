import { Box, Stack, Typography } from '@mui/material';
import GroupIcon from '@mui/icons-material/GroupOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import LocalityChip from '../../components/LocalityChip';

interface Props {
  title: string;
  price: string;
  /** "N joining now" ("N Attended" once over); empty hides it. */
  joiningText: string;
  spotsText: string;
  /** The pod is over: a checked-calendar icon instead of the people icon. The
   * caller passes the "N Attended" / "Completed" copy. */
  expired?: boolean;
  /** Host and/or place, already joined; empty hides the line. */
  subText: string;
  /** The pod's area (venue locality, else zone) — two clubs can share a name,
   * so the chip tells their pods apart. Empty for a virtual pod. */
  locality?: string | null;
  /** Stable per-pod prefix for the title/price test ids (e.g. `pod-card-${pod.pod_id}`). */
  testIdPrefix?: string;
}

const META_SX = { fontSize: 12, fontWeight: 500, lineHeight: '16px', color: 'text.secondary' } as const;

/**
 * The card's text under the image: who is coming, the title (always two lines
 * tall, so every card in a rail keeps the same image height) with the price
 * beside it, then the host/place line and the locality chip. Native twin: PodCard's PodCardInfo.
 */
export default function PodCardInfo({
  title,
  price,
  joiningText,
  spotsText,
  expired = false,
  subText,
  locality,
  testIdPrefix,
}: Readonly<Props>) {
  return (
    <Stack spacing={0.5} sx={{ pt: 1.25, px: 0.5, pb: 0.25 }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0, color: 'text.secondary' }}>
        {expired ? (
          <EventAvailableIcon sx={{ fontSize: 14, flex: '0 0 auto' }} />
        ) : (
          <GroupIcon sx={{ fontSize: 14, flex: '0 0 auto' }} />
        )}
        <Typography
          data-testid={testIdPrefix ? `${testIdPrefix}-spots` : undefined}
          noWrap
          sx={{ ...META_SX, minWidth: 0 }}
        >
          {joiningText && (
            <>
              <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>
                {joiningText}
              </Box>
              {' · '}
            </>
          )}
          {spotsText}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography
          data-testid={testIdPrefix ? `${testIdPrefix}-title` : undefined}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 40,
            fontSize: 16,
            fontWeight: 600,
            lineHeight: '20px',
            color: 'text.primary',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Typography>
        <Typography
          data-testid={testIdPrefix ? `${testIdPrefix}-price` : undefined}
          sx={{ flex: '0 0 auto', fontSize: 18, fontWeight: 700, lineHeight: '22px', color: 'text.primary' }}
        >
          {price}
        </Typography>
      </Stack>
      {subText && (
        <Typography noWrap sx={META_SX}>
          {subText}
        </Typography>
      )}
      <LocalityChip locality={locality} testId="pod-card-locality" />
    </Stack>
  );
}
