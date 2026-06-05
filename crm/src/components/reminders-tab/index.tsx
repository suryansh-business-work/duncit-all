import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { format } from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  CRM_REMINDERS,
  DELETE_CRM_REMINDER,
  TOGGLE_CRM_REMINDER,
  type CrmReminder,
} from '../../api/reminders.gql';
import { LeadDetailCard } from '../LeadDetailCard';
import ConfirmDialog from '../ConfirmDialog';
import { parseApiError } from '../../utils/parseApiError';
import ReminderFormDialog from './ReminderFormDialog';

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  leadId: string;
}

/** Reminders tab for a lead — list + add/edit/done/delete, dated to-dos. */
export default function RemindersTab({ entity, leadId }: Props) {
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
      title="Reminders"
      subtitle="Dated to-dos for this lead. They also appear on the dashboard calendar."
      action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>Add reminder</Button>}
    >
      {error && <Alert severity="error" sx={{ mb: 1 }}>{parseApiError(error)}</Alert>}
      {loading && reminders.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress /></Stack>
      ) : reminders.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No reminders yet.</Typography>
      ) : (
        <Stack spacing={1}>
          {reminders.map((r) => (
            <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
              <Tooltip title={r.status === 'DONE' ? 'Mark pending' : 'Mark done'}>
                <IconButton size="small" color={r.status === 'DONE' ? 'success' : 'default'} onClick={() => toggleMut({ variables: { id: r.id } })}>
                  {r.status === 'DONE' ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} sx={{ textDecoration: r.status === 'DONE' ? 'line-through' : 'none' }} noWrap>
                  {r.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(r.due_at), 'dd MMM yyyy, p')}{r.notes ? ` · ${r.notes}` : ''}
                </Typography>
              </Stack>
              {r.status === 'DONE' && <Chip size="small" color="success" label="Done" />}
              <IconButton size="small" onClick={() => openEdit(r)} aria-label="Edit reminder"><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => setRemoving(r)} aria-label="Delete reminder"><DeleteIcon fontSize="small" /></IconButton>
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
        title="Delete reminder"
        message={`Delete "${removing?.title ?? ''}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={async () => { if (removing) await deleteMut({ variables: { id: removing.id } }); setRemoving(null); }}
        onClose={() => setRemoving(null)}
      />
    </LeadDetailCard>
  );
}
