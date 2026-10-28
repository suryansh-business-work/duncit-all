import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { BackHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import FlowDialog from '../FlowDialog';
import SubFlowDialog from './SubFlowDialog';
import SubFlowsTable from './SubFlowsTable';
import {
  DELETE_E2E_SUB_FLOW,
  E2E_FLOW,
  errorText,
  type E2eFlow,
  type E2eSubFlow,
} from '../queries';

/** Which sub flow the dialog edits; `subFlow: null` adds one. The whole state null means closed. */
type SubFlowDialogState = { subFlow: E2eSubFlow | null } | null;

/** One flow at its own address: its sub flows as a table, each opening its steps. */
export default function E2eFlowDetailPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { flowId = '' } = useParams();
  const { data, loading, error } = useQuery<{ e2eFlow: E2eFlow | null }>(E2E_FLOW, {
    variables: { id: flowId },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteSubFlow] = useMutation<any>(DELETE_E2E_SUB_FLOW);
  const [editingFlow, setEditingFlow] = useState(false);
  const [subFlowDialog, setSubFlowDialog] = useState<SubFlowDialogState>(null);
  const flow = data?.e2eFlow ?? null;
  // Read the open sub flow from the live flow, so a review saved inside the
  // dialog shows there at once instead of the row as it was when clicked.
  const openSubFlowId = subFlowDialog?.subFlow?.id;
  const liveSubFlow = flow?.sub_flows.find((sub) => sub.id === openSubFlowId) ?? null;

  const openSubFlow = useCallback((row: E2eSubFlow) => setSubFlowDialog({ subFlow: row }), []);

  const removeSubFlow = useCallback(
    async (row: E2eSubFlow) => {
      const ok = await confirm({
        title: t('tech.e2eFlows.deleteSubFlowTitle'),
        message: t('tech.e2eFlows.deleteSubFlowMessage', { vars: { name: row.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteSubFlow({ variables: { flow_id: flowId, sub_flow_id: row.id } });
        notifySuccess(t('tech.e2eFlows.subFlowDeleted'));
      } catch (err) {
        notifyError(errorText(err));
      }
    },
    [confirm, deleteSubFlow, flowId, t]
  );

  const headerActions = flow && (
    <DuncitButton size="small" startIcon={<EditIcon />} onClick={() => setEditingFlow(true)}>
      {t('tech.e2eFlows.editFlow')}
    </DuncitButton>
  );

  return (
    <Stack spacing={2}>
      <BackHeader
        backTo="/e2e/flows"
        backAriaLabel={t('tech.e2eFlows.backToFlows')}
        eyebrow={t('tech.e2eFlows.flowEyebrow')}
        title={flow?.name ?? t('tech.e2eFlows.title')}
        actions={headerActions}
      />
      <QueryGuard
        loading={loading && !data}
        error={error}
        errorText={error?.message}
        notFound={Boolean(data) && !flow}
        notFoundText={t('tech.e2eFlows.notFound')}
      >
        {() =>
          flow && (
            <Stack spacing={2}>
              {flow.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {flow.description}
                </Typography>
              )}
              <SubFlowsTable
                subFlows={flow.sub_flows}
                toolbarActions={
                  <DuncitButton
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setSubFlowDialog({ subFlow: null })}
                  >
                    {t('tech.e2eFlows.addSubFlow')}
                  </DuncitButton>
                }
                onOpen={openSubFlow}
                onDelete={removeSubFlow}
              />
            </Stack>
          )
        }
      </QueryGuard>
      {flow && editingFlow && (
        <FlowDialog flow={flow} onClose={() => setEditingFlow(false)} />
      )}
      {flow && subFlowDialog && (
        <SubFlowDialog
          flowId={flow.id}
          subFlow={liveSubFlow}
          onClose={() => setSubFlowDialog(null)}
        />
      )}
    </Stack>
  );
}
