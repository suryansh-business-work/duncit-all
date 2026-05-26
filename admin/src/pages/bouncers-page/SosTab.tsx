import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { formatDistanceToNow } from 'date-fns';
import { ACK_SOS, BOUNCER_SOS_ALERTS, RESOLVE_SOS, type SosAlert } from './queries';

const STATUS_COLOR: Record<SosAlert['status'], 'error' | 'warning' | 'success'> = {
  ACTIVE: 'error',
  ACKNOWLEDGED: 'warning',
  RESOLVED: 'success',
};

interface Props {
  liveItems: SosAlert[];
  onClear: () => void;
}

export default function SosTab({ liveItems, onClear }: Props) {
  const { data, loading, refetch } = useQuery<{ bouncerSosAlerts: SosAlert[] }>(
    BOUNCER_SOS_ALERTS,
    { variables: { status: null }, fetchPolicy: 'cache-and-network' }
  );
  const [ack] = useMutation(ACK_SOS, { onCompleted: () => refetch() });
  const [resolve] = useMutation(RESOLVE_SOS, { onCompleted: () => refetch() });
  const [busyId, setBusyId] = useState<string | null>(null);

  const queried = data?.bouncerSosAlerts ?? [];
  const merged = mergeById(liveItems, queried);

  const run = async (id: string, fn: () => Promise<any>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Stack spacing={2}>
      {liveItems.length > 0 && (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {liveItems.length} new alert{liveItems.length === 1 ? '' : 's'} since you opened this page.
          </Typography>
          <Button size="small" onClick={onClear}>
            Clear highlight
          </Button>
        </Stack>
      )}

      {loading && !merged.length ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      ) : merged.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No SOS alerts yet. Live alerts will appear here with a beep.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        merged.map((alert) => {
          const isLive = liveItems.some((l) => l.id === alert.id);
          return (
            <Card
              key={alert.id}
              variant="outlined"
              sx={{
                borderColor: alert.status === 'ACTIVE' ? 'error.main' : 'divider',
                borderWidth: alert.status === 'ACTIVE' ? 2 : 1,
                ...(isLive && {
                  animation: 'sos-pulse 1.4s ease-in-out 3',
                  '@keyframes sos-pulse': {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(244,67,54,0)' },
                    '50%': { boxShadow: '0 0 0 8px rgba(244,67,54,0.25)' },
                  },
                }),
              }}
            >
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WarningAmberIcon color={STATUS_COLOR[alert.status]} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {alert.user.name}
                      </Typography>
                      <Chip size="small" color={STATUS_COLOR[alert.status]} label={alert.status} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </Typography>
                  </Stack>

                  <Typography variant="body2">
                    <strong>Pod:</strong> {alert.pod.title}
                    {alert.pod.venue_name ? ` · ${alert.pod.venue_name}` : ''}
                  </Typography>

                  {alert.message && (
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      "{alert.message}"
                    </Typography>
                  )}

                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    {alert.contact_phone && (
                      <Link href={`tel:${alert.contact_phone}`} variant="body2">
                        📞 {alert.contact_phone}
                      </Link>
                    )}
                    {alert.location && (
                      <Link
                        href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <LocationOnIcon fontSize="inherit" /> Open in Maps
                      </Link>
                    )}
                    {alert.host && (
                      <Typography variant="body2" color="text.secondary">
                        Host: {alert.host.name}
                        {alert.host.phone ? ` (${alert.host.phone})` : ''}
                      </Typography>
                    )}
                  </Stack>

                  {alert.status !== 'RESOLVED' && (
                    <Stack direction="row" spacing={1}>
                      {alert.status === 'ACTIVE' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          disabled={busyId === alert.id}
                          onClick={() => run(alert.id, () => ack({ variables: { id: alert.id } }))}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={busyId === alert.id}
                        onClick={() => run(alert.id, () => resolve({ variables: { id: alert.id } }))}
                      >
                        Mark resolved
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })
      )}
    </Stack>
  );
}

function mergeById<T extends { id: string; created_at: string }>(live: T[], queried: T[]): T[] {
  const map = new Map<string, T>();
  queried.forEach((q) => map.set(q.id, q));
  live.forEach((l) => map.set(l.id, l));
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
