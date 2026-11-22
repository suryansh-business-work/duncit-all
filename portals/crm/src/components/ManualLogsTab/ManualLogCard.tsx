import { Card, Chip, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/shell';
import type { CrmActivity } from '../../api/crm.types';
import { formatLogTimestamp } from './logUtils';
import { PersonLink } from './PersonLink';
import type { LogPeople } from './types';

interface Props {
  log: CrmActivity;
  people: LogPeople;
  /** The signed-in user may edit / delete this log (its author, or a SUPER_ADMIN). */
  canChange: boolean;
  onEdit: (log: CrmActivity) => void;
  onDelete: (log: CrmActivity) => void;
}

/** A deleted log keeps its place, like a deleted chat message: who, when, and nothing else. */
function DeletedLog({ log, people }: Readonly<Pick<Props, 'log' | 'people'>>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }} data-testid="manual-log-deleted">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        <BlockIcon fontSize="small" aria-hidden />
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          {t('crm.manualLogs.deletedNotice')}
        </Typography>
        {log.deleted_by ? (
          <Typography variant="caption">
            {t('crm.manualLogs.by')} <PersonLink userId={log.deleted_by} people={people} />
          </Typography>
        ) : null}
        <Typography variant="caption">{formatLogTimestamp(log.deleted_at)}</Typography>
      </Stack>
    </Card>
  );
}

export function ManualLogCard({ log, people, canChange, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  if (log.is_deleted) return <DeletedLog log={log} people={people} />;
  const title = log.summary || t('crm.manualLogs.untitled');
  return (
    <Card variant="outlined" sx={{ p: 1.5 }} data-testid="manual-log-card">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}>
        {log.summary ? (
          <Typography component="p" variant="subtitle2" sx={{ fontWeight: 700 }}>
            {log.summary}
          </Typography>
        ) : null}
        <Chip size="small" variant="outlined" label={formatLogTimestamp(log.created_at)} />
        {log.created_by ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('crm.manualLogs.by')} <PersonLink userId={log.created_by} people={people} />
          </Typography>
        ) : null}
        {log.updated_at ? (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={t('crm.manualLogs.editedAt', { vars: { time: formatLogTimestamp(log.updated_at) } })}
          />
        ) : null}
        {canChange && log.id ? (
          <Stack direction="row" sx={{ ml: 'auto' }}>
            <DuncitIconButton
              size="small"
              aria-label={t('crm.common.editNamed', { vars: { name: title } })}
              onClick={() => onEdit(log)}
              data-testid="manual-log-edit"
            >
              <EditOutlinedIcon fontSize="small" />
            </DuncitIconButton>
            <DuncitIconButton
              size="small"
              aria-label={t('crm.common.deleteNamed', { vars: { name: title } })}
              onClick={() => onDelete(log)}
              data-testid="manual-log-delete"
            >
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Stack>
        ) : null}
      </Stack>
      {log.body_html?.trim() ? (
        <DuncitRichTextInput value={log.body_html} onChange={() => undefined} readOnly bare />
      ) : (
        <Typography variant="body2">{log.body_text}</Typography>
      )}
    </Card>
  );
}
