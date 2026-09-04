import { useState, type ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import PlaceIcon from '@mui/icons-material/Place';
import EventIcon from '@mui/icons-material/Event';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import VideocamIcon from '@mui/icons-material/Videocam';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import {
  autoPodCityLabel,
  autoPodMissingRoles,
  autoPodPriced,
  autoPodRoleEarnings,
  type AutoPodRole,
  type AutoPodRow,
  type AutoPodLabels,
} from '@duncit/utils';
import { AutoPodTicks } from './AutoPodTicks';
import { AutoPodExpiryNote } from './AutoPodExpiryNote';

/**
 * The card's cover image. A template's URL is whatever was uploaded for it, and
 * an image that has since been deleted or moved 404s at request time rather
 * than arriving empty — so the dead URL is caught on its error event and swapped
 * for the placeholder instead of the browser's broken-image glyph.
 */
function AutoPodCover({ url }: Readonly<{ url: string }>) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <Box
        sx={{
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          color: 'text.disabled',
        }}
      >
        <ImageNotSupportedIcon fontSize="large" />
      </Box>
    );
  }
  return (
    <CardMedia
      component="img"
      height="150"
      image={url}
      alt=""
      onError={() => setBroken(true)}
      sx={{ objectFit: 'cover' }}
    />
  );
}

/**
 * One icon + text line: the pinned city, the venue, the slot.
 *
 * The text WRAPS rather than truncating. A card's city line is a full sentence
 * while nobody has enrolled — "Any city — the first partner to enrol sets it"
 * — and clipping it to one line hid the half that says what happens next.
 */
function DetailLine({ icon, text }: Readonly<{ icon: ReactNode; text: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', pt: '2px' }}>{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

export interface AutoPodCardProps {
  row: AutoPodRow;
  /**
   * Whose queue this card is in. Each role is paid for something different, so
   * the "You could earn" line reads that role's own figure — a venue used to be
   * shown the HOST's payout, which is a different number entirely.
   */
  role: AutoPodRole;
  labels: AutoPodLabels;
  /** Formats the slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
  /** The role's primary button — the caller owns the action. */
  action?: ReactNode;
  /** The "View Potential Earnings" control, under the card's details. */
  earningsAction?: ReactNode;
  /** What this viewer worked out in that dialog — it wins over the server's. */
  earnings?: number | null;
}

const firstImage = (row: AutoPodRow): string | null =>
  row.pod_images_and_videos.find((m) => (m.type ?? 'IMAGE') === 'IMAGE')?.url ?? null;

/**
 * One Auto Pod, as every role sees it. The card itself is role-agnostic: the
 * three enrolment ticks, the pinned city and the pod's own details read the
 * same to a venue, a host and a club admin, and only the button differs —
 * which is why the caller passes it in rather than the card branching per role.
 */
export function AutoPodCard({
  row,
  role,
  labels,
  formatWhen,
  formatMoney,
  action,
  earningsAction,
  earnings,
}: Readonly<AutoPodCardProps>) {
  const image = firstImage(row);
  const missing = autoPodMissingRoles(row);
  const venue = row.venue_claim;
  const virtual = row.pod_mode === 'VIRTUAL';
  const city = autoPodCityLabel(row.location);
  const cityLine = city ? labels.pinnedTo(city) : labels.unpinned;
  // The mode tag every card wears; the same two words on the native card.
  const modeLabel = virtual ? labels.modeVirtual : labels.modePhysical;
  const modeIcon = virtual ? <VideocamIcon /> : <PlaceIcon />;
  const priced = autoPodPriced(row);
  const earning = autoPodRoleEarnings(row, role, earnings);

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {image ? <AutoPodCover url={image} /> : null}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flexGrow: 1 }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" noWrap title={row.pod_title} sx={{
              fontWeight: 600
            }}>
              {row.pod_title}
            </Typography>
            <Chip
              size="small"
              color={virtual ? 'info' : 'default'}
              icon={modeIcon}
              label={modeLabel}
              data-testid="auto-pod-mode-tag"
              sx={{ flexShrink: 0 }}
            />
          </Stack>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {row.auto_pod_no}
            {row.category_name ? ` · ${row.category_name}` : ''}
          </Typography>
        </Box>

        <AutoPodTicks row={row} labels={labels} />

        <Stack spacing={0.5}>
          <DetailLine icon={<LocationCityIcon fontSize="small" color="action" />} text={cityLine} />
          {virtual ? (
            <DetailLine icon={<VideocamIcon fontSize="small" color="action" />} text={labels.virtualPod} />
          ) : null}
          {venue ? (
            <>
              <DetailLine icon={<PlaceIcon fontSize="small" color="action" />} text={venue.venue_name} />
              <DetailLine
                icon={<EventIcon fontSize="small" color="action" />}
                text={formatWhen(venue.pod_date_time)}
              />
            </>
          ) : null}
          {earningsAction}
        </Stack>

        <Divider />

        {/* The template carries no price: until a host sets one the card says
            who will, rather than reading "₹0" and "0 spots". */}
        {priced ? (
          <Stack direction="row" spacing={1} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            <Chip size="small" variant="outlined" label={`${labels.priceLabel}: ${formatMoney(row.pod_amount)}`} />
            <Chip size="small" variant="outlined" label={`${labels.spotsLabel}: ${row.no_of_spots}`} />
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }} data-testid="auto-pod-priced-by-host">
            {labels.pricedByHost}
          </Typography>
        )}

        {/* "You could earn ₹1,500" — or just "You could earn" until this
            viewer has priced the pod in the calculator above. */}
        <Typography
          variant="body2"
          data-testid="auto-pod-earnings"
          sx={{ color: 'success.main', fontWeight: 600 }}
        >
          {earning === null ? labels.earningsUnknown : labels.expectedEarnings(formatMoney(earning))}
        </Typography>

        <AutoPodExpiryNote expiresAt={row.expires_at} labels={labels} />

        {missing.length > 0 ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {labels.waitingFor(missing)}
          </Typography>
        ) : null}

        <Box sx={{ mt: 'auto', pt: 1 }}>{action}</Box>
      </CardContent>
    </Card>
  );
}
