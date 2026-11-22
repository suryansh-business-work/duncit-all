import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { ProspectLeadEntity } from '../../api/crm.types';
import type { ProspectLead } from '../../api/prospectLeads.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import { CrmLeadsTable } from '../../components/lead-table';
import { useLeadsTableFetch } from '../../hooks/useNearbyLeads';
import { useLeadEditorOrigin } from '../../hooks/useLeadEditorFlow';
import { PROSPECT_KINDS } from './prospectKinds';

const asOptions = (values: string[]) => values.map((value) => ({ label: value, value }));

/** Leads › Creators Leads / Community Leads — the server-driven list for one kind. */
export default function ProspectLeadsPage({ entity }: Readonly<{ entity: ProspectLeadEntity }>) {
  const kind = PROSPECT_KINDS[entity];
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editorOrigin = useLeadEditorOrigin();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const refetchRef = useRef<(() => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProspectLead | null>(null);
  const [deleteLead, { loading: deleting }] = useMutation<{ [key: string]: boolean }, { id: string }>(kind.docs.remove);

  const { fetchRows, nearby } = useLeadsTableFetch<ProspectLead>(kind.docs.table, kind.docs.tableKey);
  const statusOptions = useMemo(() => asOptions(config.host_lead_statuses ?? []), [config]);
  const priorityOptions = useMemo(() => asOptions(config.priorities ?? []), [config]);
  const superCategoryOptions = useMemo(
    () => superCategories.map((c) => ({ label: c.name, value: c.id })),
    [superCategories]
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLead({ variables: { id: toDelete.id } });
      setToast(t(kind.copy.deleted));
      setToDelete(null);
      refetchRef.current?.();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          {t(kind.copy.title)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t(kind.copy.subtitle)}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <CrmLeadsTable<ProspectLead>
        entity={kind.tableEntity}
        fetchRows={fetchRows}
        nearby={nearby}
        refetchRef={refetchRef}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        superCategoryOptions={superCategoryOptions}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`${kind.basePath}/new`, { state: editorOrigin })}
          >
            {t(kind.copy.newLead)}
          </DuncitButton>
        }
        onView={(lead) => navigate(`${kind.basePath}/${lead.id}/view`)}
        onEdit={(lead) => navigate(`${kind.basePath}/${lead.id}`, { state: editorOrigin })}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t(kind.copy.deleteTitle)}
        message={t(kind.copy.deleteMessage, { vars: { name: toDelete ? kind.displayName(toDelete) : '' } })}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel={t('shell.common.deleting')}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
