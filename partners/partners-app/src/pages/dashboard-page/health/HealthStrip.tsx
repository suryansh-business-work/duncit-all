import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import HealthMeter from './HealthMeter';
import HealthDetailDialog from './HealthDetailDialog';
import { PARTNER_HEALTH, PARTNER_VENUE_HEALTH, type HealthScore } from './queries';

interface VenueLite {
  id: string;
  venue_name?: string | null;
}

interface Props {
  venues: VenueLite[];
}

// Compact dashboard strip. Shows the partner's host meter (if they have a
// host profile) and one meter per approved venue. Tap any meter to open the
// detail dialog with admin remarks.
export default function HealthStrip({ venues }: Readonly<Props>) {
  const client = useApolloClient();
  const { data: hostData } = useQuery<{ myAccountHealth: HealthScore | null }>(PARTNER_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });
  const [selected, setSelected] = useState<HealthScore | null>(null);

  const accountHealth = hostData?.myAccountHealth ?? null;

  // Per-venue health is fetched on demand when the meter is tapped. That keeps
  // the dashboard render light for partners with many venues; the dialog is
  // already a click-to-open surface.
  const openVenueDialog = async (venue: VenueLite) => {
    try {
      const { data } = await client.query<{ myVenueHealth: HealthScore | null }>({
        query: PARTNER_VENUE_HEALTH,
        variables: { venue_id: venue.id },
        fetchPolicy: 'network-only',
      });
      if (data?.myVenueHealth) setSelected(data.myVenueHealth);
    } catch {
      // Surface failures softly — the dashboard remains usable.
    }
  };

  if (!accountHealth && venues.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={950}>Account Health</Typography>
            <Chip size="small" label="Tap a meter for details" sx={{ fontWeight: 700 }} />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {accountHealth && (
              <MeterCard
                title="Account"
                subtitle={accountHealth.subject_label}
                score={accountHealth}
                onClick={() => setSelected(accountHealth)}
              />
            )}
            {venues.map((venue) => (
              <MeterCard
                key={venue.id}
                title="Venue"
                subtitle={venue.venue_name ?? 'Venue'}
                score={null}
                pendingVenueId={venue.id}
                onClick={() => openVenueDialog(venue)}
              />
            ))}
          </Stack>
        </Stack>
      </CardContent>
      <HealthDetailDialog
        open={!!selected}
        score={selected}
        onClose={() => setSelected(null)}
      />
    </Card>
  );
}

interface MeterCardProps {
  title: string;
  subtitle: string;
  score: HealthScore | null;
  pendingVenueId?: string;
  onClick: () => void;
}

function MeterCard({ title, subtitle, score, onClick }: Readonly<MeterCardProps>) {
  // When `score` is null, render a neutral placeholder. The detail dialog
  // fetches the real numbers on demand.
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      sx={{
        flex: '0 0 auto',
        minWidth: 160,
        p: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 120ms ease',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
        '&:focus-visible': { outline: 'none', boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}` },
      }}
    >
      <Stack alignItems="center" spacing={0.5}>
        <HealthMeter score={score?.total_score ?? 50} band={score?.band ?? 'YELLOW'} size={120} />
        <Typography variant="caption" sx={{ fontWeight: 900 }} color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, maxWidth: 160, textAlign: 'center' }} noWrap>
          {subtitle}
        </Typography>
      </Stack>
    </Box>
  );
}
