import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import {
  CRM_REMINDERS,
  DELETE_CRM_REMINDER,
  TOGGLE_CRM_REMINDER,
  type CrmReminder,
} from '../../api/reminders.gql';
import { LeadDetailCard } from '../LeadDetailCard';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import ReminderFormDialog from './ReminderFormDialog';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
}

/** Reminders tab for a lead — list + add/edit/done/delete, dated to-dos. */
export default function RemindersTab({ entity, leadId }: Readonly<Props>) {
  const { t } = useTranslation();
  const variables = { filter: { entity_type: entity, lead_id: leadId } };
  const { data, loading, error } = useQuery<{ crmReminders: CrmReminder[] }>(CRM_REMINDERS, { variables, fetchPolicy: 'cache-and-network' });
  const refetchQueries = [{ query: CRM_REMINDERS, variables }];
  const [toggleMut] = useMutation(TOGGLE_CRM_REMINDER, { refetchQueries });
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_REMINDER, { refetchQueries });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrmReminder | null>(null);
  const [removing, setRemoving] = useState<CrmReminder | null>(null);

  const reminders = data?.crmReminders ?? [];

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: CrmReminder) => { setEditing(r); setFormOpen(true); };

  return (
    <LeadDetailCard
      title={t('shell.nav.reminders')}
      subtitle={t('crm.components.datedToDosForThisLead')}
      action={<DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>{t('crm.components.addReminder')}</DuncitButton>}
    >
      {error && <Alert severity="error" sx={{ mb: 1 }}>{parseApiError(error)}</Alert>}
      {loading && reminders.length === 0 && (
        <Stack
          sx={{
            alignItems: "center",
            py: 3
          }}><CircularProgress /></Stack>
      )}
      {!loading && reminders.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{t('crm.components.noRemindersYet')}</Typography>
      )}
      {reminders.length > 0 && (
        <Stack spacing={1}>
          {reminders.map((r) => (
            <Stack
              key={r.id}
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1
              }}>
              <Tooltip title={r.status === 'DONE' ? 'Mark pending' : 'Mark done'}>
                <DuncitIconButton size="small" color={r.status === 'DONE' ? 'success' : 'default'} onClick={() => toggleMut({ variables: { id: r.id } })}>
                  {r.status === 'DONE' ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                </DuncitIconButton>
              </Tooltip>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{
                    fontWeight: 700,
                    textDecoration: r.status === 'DONE' ? 'line-through' : 'none'
                  }}>
                  {r.title}
                </Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {formatDateTime(r.due_at)}{r.notes ? ` · ${r.notes}` : ''}
                </Typography>
              </Stack>
              {r.status === 'DONE' && <Chip size="small" color="success" label={t('crm.components.done')} />}
              <DuncitIconButton size="small" onClick={() => openEdit(r)} aria-label={t('crm.components.editReminder')}><EditIcon fontSize="small" /></DuncitIconButton>
              <DuncitIconButton size="small" color="error" onClick={() => setRemoving(r)} aria-label={t('crm.components.deleteReminder')}><DeleteIcon fontSize="small" /></DuncitIconButton>
            </Stack>
          ))}
        </Stack>
      )}

      <ReminderFormDialog
        open={formOpen}
        entity={entity}
        leadId={leadId}
        reminder={editing}
        refetchQueries={refetchQueries}
        onClose={() => setFormOpen(false)}
        onSaved={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={!!removing}
        title={t('crm.components.deleteReminder')}
        message={`Delete "${removing?.title ?? ''}"?`}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={async () => { if (removing) { await deleteMut({ variables: { id: removing.id } }); } setRemoving(null); }}
        onClose={() => setRemoving(null)}
      />
    </LeadDetailCard>
  );
}
