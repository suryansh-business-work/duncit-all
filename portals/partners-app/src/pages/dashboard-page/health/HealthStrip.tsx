import { useState } from 'react';
import { useQuery } from '@apollo/client';
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

// Compact dashboard strip. Shows the partner's account meter plus one meter per
// venue. Every meter reads the same live score the detail dialog uses, so the
// number rendered on the dashboard always matches the number shown after a tap.
export default function HealthStrip({ venues }: Readonly<Props>) {
  const { data: hostData } = useQuery<{ myAccountHealth: HealthScore | null }>(PARTNER_HEALTH, {
    fetchPolicy: 'cache-and-network',
  });
  const [selected, setSelected] = useState<HealthScore | null>(null);

  const accountHealth = hostData?.myAccountHealth ?? null;

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
              <VenueMeter key={venue.id} venue={venue} onOpen={setSelected} />
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

// One venue meter. Reads the venue's live health up front so the dashboard shows
// the real score (not a placeholder); the very same record opens in the dialog
// on tap, keeping the two views in lock-step.
function VenueMeter({
  venue,
  onOpen,
}: Readonly<{ venue: VenueLite; onOpen: (s: HealthScore) => void }>) {
  const { data } = useQuery<{ myVenueHealth: HealthScore | null }>(PARTNER_VENUE_HEALTH, {
    variables: { venue_id: venue.id },
    fetchPolicy: 'cache-and-network',
  });
  const score = data?.myVenueHealth ?? null;
  return (
    <MeterCard
      title="Venue"
      subtitle={venue.venue_name ?? 'Venue'}
      score={score}
      onClick={() => {
        if (score) onOpen(score);
      }}
    />
  );
}

interface MeterCardProps {
  title: string;
  subtitle: string;
  score: HealthScore | null;
  onClick: () => void;
}

function MeterCard({ title, subtitle, score, onClick }: Readonly<MeterCardProps>) {
  // While the score is still loading the meter shows a neutral placeholder; it
  // snaps to the real value as soon as the query resolves.
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
