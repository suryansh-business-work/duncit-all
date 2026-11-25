import type { CrmLeadEntityType } from '../../api/crm.types';
import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Chip, CircularProgress, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDebouncedValue } from '@duncit/ui';
import ForumIcon from '@mui/icons-material/Forum';
import {
  COMMUNICATION_LOGS,
  REQUEST_COMMUNICATION_TRANSCRIPT,
  SUMMARIZE_COMMUNICATION_LOG,
  type CommunicationLogItem,
} from '../../api/comms.gql';
import { parseApiError } from '@duncit/utils';
import { useCallSocket } from '../../hooks/useCallSocket';
import LogRow from './LogRow';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs as appLogs } from '@duncit/logs';
import { crmCommsTypeCounts } from '@duncit/utils';

type Filter = 'ALL' | 'EMAIL' | 'CALL';

interface Props {
  entityType: CrmLeadEntityType;
  entityId: string;
}

export default function CommsLogsSection({ entityType, entityId }: Readonly<Props>) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const query = useDebouncedValue(search.trim(), 300);
  const { data, loading, error, refetch } = useQuery<{ communicationLogs: { items: CommunicationLogItem[]; total: number } }>(
    COMMUNICATION_LOGS,
    {
      variables: {
        filter: { entity_type: entityType, entity_id: entityId, type: filter === 'ALL' ? null : filter, search: query || null },
        limit: 100,
        offset: 0,
      },
      fetchPolicy: 'cache-and-network',
    }
  );
  const [requestTranscript, { loading: requesting }] = useMutation<any>(REQUEST_COMMUNICATION_TRANSCRIPT);
  const [summarize] = useMutation(SUMMARIZE_COMMUNICATION_LOG);

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

  // Transcript and summary failures share the one dismissible error line above the list.
  const handleSummarize = async (id: string) => {
    setTranscriptError(null);
    setSummarizingId(id);
    try {
      await summarize({ variables: { id } });
      await refetch();
    } catch (err) {
      setTranscriptError(parseApiError(err));
    } finally {
      setSummarizingId(null);
    }
  };

  const counts = crmCommsTypeCounts(logs);

  const logsContent = logs.length === 0 ? (
    <Typography
      variant="body2"
      sx={{
        color: "text.secondary",
        py: 4,
        textAlign: 'center'
      }}>
      {t('crm.comms.empty')}
    </Typography>
  ) : (
    <Stack spacing={1}>
      {logs.map((log) => (
        <LogRow
          key={log.id}
          log={log}
          onRequestTranscript={handleTranscript}
          onSummarize={(id) => fireAndForget(handleSummarize(id), appLogs.portal.crm, 'CommsLogsSection', 'summarize')}
          refreshing={requesting}
          summarizing={summarizingId === log.id}
        />
      ))}
    </Stack>
  );

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <ForumIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h2" variant="h6" sx={{
              fontWeight: 800
            }}>{t('crm.components.communicationLog')}</Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('crm.comms.subtitle')}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            mb: 2
          }}>
          <Chip
            label={t('crm.comms.filterAll', { vars: { count: total } })}
            color={filter === 'ALL' ? 'primary' : 'default'}
            variant={filter === 'ALL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('ALL')}
            aria-pressed={filter === 'ALL'}
            data-testid="crm-comms-filter-all"
            size="small"
          />
          <Chip
            label={t('crm.comms.filterEmail', { vars: { count: counts.EMAIL } })}
            color={filter === 'EMAIL' ? 'primary' : 'default'}
            variant={filter === 'EMAIL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('EMAIL')}
            aria-pressed={filter === 'EMAIL'}
            data-testid="crm-comms-filter-email"
            size="small"
          />
          <Chip
            label={t('crm.comms.filterCall', { vars: { count: counts.CALL } })}
            color={filter === 'CALL' ? 'primary' : 'default'}
            variant={filter === 'CALL' ? 'filled' : 'outlined'}
            onClick={() => setFilter('CALL')}
            aria-pressed={filter === 'CALL'}
            data-testid="crm-comms-filter-call"
            size="small"
          />
        </Stack>

        <TextField
          size="small"
          fullWidth
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('crm.call.searchLogs')}
          sx={{ mb: 2 }}
          slotProps={{
            htmlInput: { 'aria-label': t('crm.call.searchLogs') },
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          }}
        />

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
