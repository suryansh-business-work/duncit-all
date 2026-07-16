import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { formatDistanceToNow } from 'date-fns';
import { BackHeader, StatusChip } from '@duncit/ui';
import {
  ACK_SOS,
  BOUNCER_SOS_ALERT,
  RESOLVE_SOS,
  type SosAlert,
} from '../../graphql/bouncer';
import { SOS_STATUS_COLORS } from '../../lib/statusMaps';

type SosAlertContactsProps = {
  alert: SosAlert;
};

function SosAlertContacts({ alert }: Readonly<SosAlertContactsProps>) {
  return (
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
  );
}

type SosAlertActionsProps = {
  status: SosAlert['status'];
  busy: boolean;
  onAck: () => void;
  onResolve: () => void;
};

function SosAlertActions({ status, busy, onAck, onResolve }: Readonly<SosAlertActionsProps>) {
  if (status === 'RESOLVED') {
    return null;
  }
  return (
    <Stack direction="row" spacing={1}>
      {status === 'ACTIVE' && (
        <Button variant="contained" color="warning" disabled={busy} onClick={onAck}>
          Acknowledge
        </Button>
      )}
      <Button variant="contained" color="success" disabled={busy} onClick={onResolve}>
        Mark resolved
      </Button>
    </Stack>
  );
}

type SosAlertCardProps = {
  alert: SosAlert;
  busy: boolean;
  onAck: () => void;
  onResolve: () => void;
};

function SosAlertCard({ alert, busy, onAck, onResolve }: Readonly<SosAlertCardProps>) {
  return (
    <Card variant="outlined" sx={{ borderColor: alert.status === 'ACTIVE' ? 'error.main' : 'divider' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {alert.user.name}
              </Typography>
              <Chip size="small" variant="outlined" label={alert.ticket_no} />
              <StatusChip status={alert.status} colorMap={SOS_STATUS_COLORS} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
            </Typography>
          </Stack>

          <Typography variant="body2">
            <strong>Pod:</strong> {alert.pod.title}
            {alert.pod.venue_name ? ` · ${alert.pod.venue_name}` : ''}
            {alert.pod.club_name ? ` · ${alert.pod.club_name}` : ''}
          </Typography>

          {alert.message && (
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              "{alert.message}"
            </Typography>
          )}

          <SosAlertContacts alert={alert} />

          <SosAlertActions
            status={alert.status}
            busy={busy}
            onAck={onAck}
            onResolve={onResolve}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function SosDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerSosAlert: SosAlert | null }>(
    BOUNCER_SOS_ALERT,
    { variables: { id }, fetchPolicy: 'cache-and-network', skip: !id },
  );
  const [ack] = useMutation(ACK_SOS, { onCompleted: () => refetch() });
  const [resolve] = useMutation(RESOLVE_SOS, { onCompleted: () => refetch() });
  const [busy, setBusy] = useState(false);

  const alert = data?.bouncerSosAlert ?? undefined;

  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  let content: ReactNode;
  if (loading && !alert) {
    content = (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  } else if (alert) {
    content = (
      <SosAlertCard
        alert={alert}
        busy={busy}
        onAck={() => run(() => ack({ variables: { id: alert.id } }))}
        onResolve={() => run(() => resolve({ variables: { id: alert.id } }))}
      />
    );
  } else {
    content = (
      <Typography variant="body2" color="text.secondary">
        This alert could not be found.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <BackHeader onBack={() => navigate('/sos')} title="SOS Alert" titleWeight={800} />

      {content}
    </Stack>
  );
}
