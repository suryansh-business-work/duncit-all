import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, MenuItem, Select, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { parseApiError } from '@duncit/utils';
import { ADD_CRM_MANUAL_LOG, ECOMM_LEAD, HOST_LEAD, VENUE_LEAD } from '../../api/crm.gql';
import { groupLogs } from './logUtils';
import { ManualLogComposer } from './ManualLogComposer';
import { ManualLogList } from './ManualLogList';
import type { Granularity, LogBody, ManualLogsTabProps } from './types';

const EMPTY_BODY: LogBody = { html: '', text: '' };

export default function ManualLogsTab({
  entityType,
  entityId,
  activities,
}: Readonly<ManualLogsTabProps>) {
  const [openComposer, setOpenComposer] = useState(false);
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState<LogBody>(EMPTY_BODY);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('all');
  const groups = useMemo(() => groupLogs(activities, granularity), [activities, granularity]);
  const [createLog, { loading: saving }] = useMutation(ADD_CRM_MANUAL_LOG, {
    refetchQueries: [
      {
        query: { VENUE_LEAD, HOST_LEAD, ECOMM_LEAD }[entityType],
        variables: { id: entityId },
      },
    ],
    awaitRefetchQueries: true,
  });
  const closeComposer = () => {
    setOpenComposer(false);
    setError(null);
  };
  const submit = async () => {
    setError(null);
    if (!body.html.trim()) {
      setError('Please write something before saving.');
      return;
    }
    try {
      await createLog({
        variables: {
          input: {
            entity_type: entityType,
            entity_id: entityId,
            summary: summary.trim(),
            body_html: body.html,
            body_text: body.text,
          },
        },
      });
      setSummary('');
      setBody(EMPTY_BODY);
      closeComposer();
    } catch (caught) {
      setError(parseApiError(caught));
    }
  };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
          <EventNoteIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              Manual logs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Notes captured by the team. Rich text · grouped by day · newest first.
            </Typography>
          </Box>
        </Stack>
        <Select
          size="small"
          value={granularity}
          onChange={(event) => setGranularity(event.target.value as Granularity)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All time</MenuItem>
          <MenuItem value="today">Today</MenuItem>
          <MenuItem value="week">Last 7 days</MenuItem>
          <MenuItem value="month">Last 30 days</MenuItem>
        </Select>
        {openComposer ? null : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenComposer(true)}
            data-testid="manual-log-add"
          >
            New log
          </Button>
        )}
      </Stack>
      {openComposer ? (
        <ManualLogComposer
          body={body}
          error={error}
          saving={saving}
          summary={summary}
          onBodyChange={setBody}
          onCancel={closeComposer}
          onErrorClose={() => setError(null)}
          onSubmit={() => {
            submit().catch((caught) => setError(parseApiError(caught)));
          }}
          onSummaryChange={setSummary}
        />
      ) : null}
      <ManualLogList groups={groups} />
    </Stack>
  );
}
