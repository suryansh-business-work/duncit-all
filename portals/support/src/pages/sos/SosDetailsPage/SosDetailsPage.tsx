import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { BackHeader } from '@duncit/ui';
import {
  ACK_SOS,
  BOUNCER_SOS_ALERT,
  RESOLVE_SOS,
  type SosAlert,
} from '../../../graphql/bouncer';
import { useTranslation } from '@duncit/shell';
import SosAlertCard from './SosAlertCard';

export default function SosDetailsPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<{ bouncerSosAlert: SosAlert | null }>(
    BOUNCER_SOS_ALERT,
    { variables: { id }, fetchPolicy: 'cache-and-network', skip: !id },
  );
  const [ack] = useMutation<any>(ACK_SOS, { onCompleted: () => refetch() });
  const [resolve] = useMutation<any>(RESOLVE_SOS, { onCompleted: () => refetch() });
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
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        This alert could not be found.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <BackHeader onBack={() => navigate('/sos')} title={t('support.sos.detailTitle')} titleWeight={800} />

      {content}
    </Stack>
  );
}
