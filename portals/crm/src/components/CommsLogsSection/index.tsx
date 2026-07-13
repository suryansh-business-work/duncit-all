import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import { COMMUNICATION_LOGS, REQUEST_COMMUNICATION_TRANSCRIPT, type CommunicationLogItem } from '../../api/comms.gql';
import { parseApiError } from '../../utils/parseApiError';
import { useCallSocket } from '../../hooks/useCallSocket';
import LogRow from './LogRow';

type Filter = 'ALL' | 'EMAIL' | 'CALL';

interface Props {
  entityType: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  entityId: string;
}

export default function CommsLogsSection({ entityType, entityId }: Readonly<Props>) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ communicationLogs: { items: CommunicationLogItem[]; total: number } }>(
    COMMUNICATION_LOGS,
    {
      variables: {
        filter: { entity_type: entityType, entity_id: entityId, type: filter === 'ALL' ? null : filter },
        limit: 100,
        offset: 0,
      },
      fetchPolicy: 'cache-and-network',
    }
  );
  const [requestTranscript, { loading: requesting }] = useMutation(REQUEST_COMMUNICATION_TRANSCRIPT);

  // Live-refresh the log when a call for this lead changes state (e.g. the
  // customer hangs up → the call is marked "over" here in real time).
  useCallSocket((payload) => {
    if (payload.entity_id && payload.entity_id !== entityId) return;
    refetch();
  });

  const logs = data?.communicationLogs?.items ?? [];
  const total = data?.communicationLogs?.total ?? 0;

  const handleTranscript = async (id: string) => {
    setTranscriptError(null);
    try {
      await requestTranscript({ variables: { id } });
      await refetch();
    } catch (err) {
      setTranscriptError(parseApiError(err));
    }
  };

  const counts = logs.reduce(
    (acc, log) => {
      acc[log.type] += 1;
      return acc;
    },
    { EMAIL: 0, CALL: 0 }
  );

  const logsContent = logs.length === 0 ? (
    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
      No communication yet. Email or call from the actions above to start the log.
    </Typography>
  ) : (
    <Stack spacing={1}>
      {logs.map((log) => (
        <LogRow key={log.id} log={log} onRequestTranscript={handleTranscript} refreshing={requesting} />
      ))}
    </Stack>
  );

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <ForumIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800}>Communication Log</Typography>
            <Typography variant="caption" color="text.secondary">
              Calls via Twilio, emails via SMTP. Transcripts are fetched from Servam AI for recorded calls.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
          <Chip
            label={`All (${total})`}
            color={filter === 'ALL' ? 'primary' : 'default'}
            variant={filter === 'ALL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('ALL')}
            size="small"
          />
          <Chip
            label={`Email (${counts.EMAIL})`}
            color={filter === 'EMAIL' ? 'primary' : 'default'}
            variant={filter === 'EMAIL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('EMAIL')}
            size="small"
          />
          <Chip
            label={`Call (${counts.CALL})`}
            color={filter === 'CALL' ? 'primary' : 'default'}
            variant={filter === 'CALL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('CALL')}
            size="small"
          />
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{parseApiError(error)}</Alert>}
        {transcriptError && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setTranscriptError(null)}>{transcriptError}</Alert>}

        {loading && !logs.length ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          logsContent
        )}
      </CardContent>
    </Card>
  );
}
