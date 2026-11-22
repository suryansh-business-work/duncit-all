import { useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Select, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { CrmActivity } from '../../api/crm.types';
import { useCrmPeople, useStaffMentions } from '../../hooks/useCrmPeople';
import UserDetailsDialog from '../user-details/UserDetailsDialog';
import { groupLogs, logHistory, peopleIds } from './logUtils';
import { LogHistory } from './LogHistory';
import { ManualLogComposer } from './ManualLogComposer';
import { ManualLogList } from './ManualLogList';
import { useManualLogActions } from './useManualLogActions';
import type { ComposerMode, Granularity, LogBody, LogPeople, ManualLogsTabProps } from './types';

const EMPTY_BODY: LogBody = { html: '', text: '' };

export default function ManualLogsTab({ entityType, entityId, activities }: Readonly<ManualLogsTabProps>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ComposerMode>({ kind: 'closed' });
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState<LogBody>(EMPTY_BODY);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('all');
  const [removing, setRemoving] = useState<CrmActivity | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const actions = useManualLogActions(entityType, entityId);
  const mentions = useStaffMentions();
  const groups = useMemo(() => groupLogs(activities, granularity), [activities, granularity]);
  const history = useMemo(() => logHistory(activities, granularity), [activities, granularity]);
  const ids = useMemo(() => peopleIds(activities), [activities]);
  const { byId } = useCrmPeople(ids);
  const people: LogPeople = useMemo(() => ({ byId, onOpenPerson: setPersonId }), [byId]);

  // The server decides (its author, or a SUPER_ADMIN) and enforces it again on every change.
  const canChange = (log: CrmActivity) => Boolean(log.can_change);

  const openComposer = (next: ComposerMode, log?: CrmActivity) => {
    setSummary(log?.summary ?? '');
    setBody(log ? { html: log.body_html ?? '', text: log.body_text ?? '' } : EMPTY_BODY);
    setError(null);
    setMode(next);
  };
  const closeComposer = () => openComposer({ kind: 'closed' });

  const submit = async () => {
    setError(null);
    try {
      if (mode.kind === 'edit' && mode.log.id) await actions.update(mode.log.id, { summary, body });
      else await actions.create({ summary, body });
      closeComposer();
    } catch (error_) {
      setError(parseApiError(error_));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
          <EventNoteIcon color="primary" />
          <Box>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t('crm.common.manualLogs')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('crm.manualLogs.subtitle')}
            </Typography>
          </Box>
        </Stack>
        <Select
          size="small"
          value={granularity}
          onChange={(event) => setGranularity(event.target.value as Granularity)}
          inputProps={{ 'aria-label': t('crm.a11y.timeRange') }}
          data-testid="manual-log-range"
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">{t('crm.components.allTime')}</MenuItem>
          <MenuItem value="today">{t('crm.components.today')}</MenuItem>
          <MenuItem value="week">{t('crm.components.last7Days')}</MenuItem>
          <MenuItem value="month">{t('crm.components.last30Days')}</MenuItem>
        </Select>
        {mode.kind === 'closed' ? (
          <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={() => openComposer({ kind: 'new' })} data-testid="manual-log-add">
            {t('crm.manualLogs.new')}
          </DuncitButton>
        ) : null}
      </Stack>
      {mode.kind === 'closed' ? null : (
        <ManualLogComposer
          editing={mode.kind === 'edit'}
          body={body}
          error={error}
          saving={actions.saving}
          summary={summary}
          mentions={mentions}
          onBodyChange={setBody}
          onCancel={closeComposer}
          onErrorClose={() => setError(null)}
          onSubmit={() => {
            submit().catch((error_) => setError(parseApiError(error_)));
          }}
          onSummaryChange={setSummary}
        />
      )}
      {error && mode.kind === 'closed' ? (
        <Alert severity="error" onClose={() => setError(null)} data-testid="manual-log-error">
          {error}
        </Alert>
      ) : null}
      <ManualLogList
        groups={groups}
        people={people}
        canChange={canChange}
        onEdit={(log) => openComposer({ kind: 'edit', log }, log)}
        onDelete={setRemoving}
      />
      <LogHistory entries={history} people={people} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={t('crm.manualLogs.deleteTitle')}
        message={t('crm.manualLogs.deleteMessage')}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel={t('crm.manualLogs.deleting')}
        loading={actions.deleting}
        onConfirm={async () => {
          if (removing?.id) await actions.remove(removing.id).catch((error_: unknown) => setError(parseApiError(error_)));
          setRemoving(null);
        }}
        onClose={() => setRemoving(null)}
      />
      <UserDetailsDialog
        user={personId ? (byId.get(personId) ?? { id: personId, name: '', roles: [], is_staff: false }) : null}
        onClose={() => setPersonId(null)}
      />
    </Stack>
  );
}
