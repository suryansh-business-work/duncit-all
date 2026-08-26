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
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import {
  autoPodCityLabel,
  autoPodMissingRoles,
  type AutoPodRow,
  type AutoPodLabels,
} from '@duncit/utils';
import { AutoPodTicks } from './AutoPodTicks';

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

/** One icon + text line: the pinned city, the venue, the slot. */
function DetailLine({ icon, text }: Readonly<{ icon: ReactNode; text: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      {icon}
      <Typography variant="body2" noWrap title={text}>
        {text}
      </Typography>
    </Stack>
  );
}

export interface AutoPodCardProps {
  row: AutoPodRow;
  labels: AutoPodLabels;
  /** Formats the slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
  /** The role's primary button — the caller owns the action. */
  action?: ReactNode;
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
  labels,
  formatWhen,
  formatMoney,
  action,
}: Readonly<AutoPodCardProps>) {
  const image = firstImage(row);
  const missing = autoPodMissingRoles(row);
  const venue = row.venue_claim;
  const city = autoPodCityLabel(row.location);
  const cityLine = city ? labels.pinnedTo(city) : labels.unpinned;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {image ? <AutoPodCover url={image} /> : null}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, flexGrow: 1 }}>
        <Box>
          <Typography variant="subtitle1" noWrap title={row.pod_title} sx={{
            fontWeight: 600
          }}>
            {row.pod_title}
          </Typography>
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
          {venue ? (
            <>
              <DetailLine icon={<PlaceIcon fontSize="small" color="action" />} text={venue.venue_name} />
              <DetailLine
                icon={<EventIcon fontSize="small" color="action" />}
                text={formatWhen(venue.pod_date_time)}
              />
            </>
          ) : null}
        </Stack>

        <Divider />

        <Stack direction="row" spacing={1} useFlexGap sx={{
          flexWrap: "wrap"
        }}>
          <Chip size="small" variant="outlined" label={`${labels.priceLabel}: ${formatMoney(row.pod_amount)}`} />
          <Chip size="small" variant="outlined" label={`${labels.spotsLabel}: ${row.no_of_spots}`} />
        </Stack>

        {typeof row.expected_host_earnings === 'number' ? (
          <Typography variant="body2" sx={{
            color: "success.main"
          }}>
            {labels.expectedEarnings(formatMoney(row.expected_host_earnings))}
          </Typography>
        ) : null}

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
