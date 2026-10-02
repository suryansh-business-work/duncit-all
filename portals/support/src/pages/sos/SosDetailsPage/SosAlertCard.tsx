import { Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { DuncitButton } from '@duncit/buttons';
import { formatDistanceToNow } from 'date-fns';
import { StatusChip } from '@duncit/ui';
import type { SosAlert } from '../../../graphql/bouncer';
import { SOS_STATUS_COLORS } from '../../../lib/statusMaps';

type SosAlertContactsProps = {
  alert: SosAlert;
};

function SosAlertContacts({ alert }: Readonly<SosAlertContactsProps>) {
  return (
    <Stack direction="row" spacing={2} sx={{
      flexWrap: "wrap"
    }}>
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
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
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
        <DuncitButton variant="contained" color="warning" disabled={busy} onClick={onAck} data-testid="sos-acknowledge">
          Acknowledge
        </DuncitButton>
      )}
      <DuncitButton variant="contained" color="success" disabled={busy} onClick={onResolve} data-testid="sos-resolve">
        Mark resolved
      </DuncitButton>
    </Stack>
  );
}

type SosAlertCardProps = {
  alert: SosAlert;
  busy: boolean;
  onAck: () => void;
  onResolve: () => void;
};

export default function SosAlertCard({ alert, busy, onAck, onResolve }: Readonly<SosAlertCardProps>) {
  return (
    <Card variant="outlined" sx={{ borderColor: alert.status === 'ACTIVE' ? 'error.main' : 'divider' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between"
            }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              <Typography variant="h6" data-testid="sos-detail-user" sx={{ fontWeight: 800 }}>
                {alert.user.name}
              </Typography>
              <Chip size="small" variant="outlined" label={alert.ticket_no} />
              <StatusChip status={alert.status} colorMap={SOS_STATUS_COLORS} data-testid="sos-detail-status" />
            </Stack>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
            </Typography>
          </Stack>

          <Typography variant="body2">
            <strong>Pod:</strong> {alert.pod.title}
            {alert.pod.venue_name ? ` · ${alert.pod.venue_name}` : ''}
            {alert.pod.club_name ? ` · ${alert.pod.club_name}` : ''}
          </Typography>

          {alert.message && (
            <Typography variant="body2" data-testid="sos-detail-message" sx={{ fontStyle: 'italic' }}>
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
