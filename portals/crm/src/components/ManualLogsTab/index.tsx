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
import { useTranslation } from '@duncit/shell';

const EMPTY_BODY: LogBody = { html: '', text: '' };

export default function ManualLogsTab({
  entityType,
  entityId,
  activities,
}: Readonly<ManualLogsTabProps>) {
  const { t } = useTranslation();
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
      setError(t('crm.components.pleaseWriteSomethingBeforeSaving'));
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
    } catch (error_) {
      setError(parseApiError(error_));
    }
  };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{
        alignItems: { sm: 'center' }
      }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            flex: 1
          }}>
          <EventNoteIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{
              fontWeight: 800
            }}>
              Manual logs
            </Typography>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
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
          <MenuItem value="all">{t('crm.components.allTime')}</MenuItem>
          <MenuItem value="today">{t('crm.components.today')}</MenuItem>
          <MenuItem value="week">{t('crm.components.last7Days')}</MenuItem>
          <MenuItem value="month">{t('crm.components.last30Days')}</MenuItem>
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
            submit().catch((error_) => setError(parseApiError(error_)));
          }}
          onSummaryChange={setSummary}
        />
      ) : null}
      <ManualLogList groups={groups} />
    </Stack>
  );
}
