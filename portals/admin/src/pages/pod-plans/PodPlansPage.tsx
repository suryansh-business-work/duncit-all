import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { notifyError, notifySuccess } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import PodPlanFormDialog, { type PodPlanFormValues } from './PodPlanFormDialog';
import PodPlansTable, { type PlanRow } from './PodPlansTable';
import { CREATE_POD_PLAN, DELETE_POD_PLAN, PLANS_TABLE, UPDATE_POD_PLAN } from './queries';

export default function PodPlansPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createMut, createState] = useMutation(CREATE_POD_PLAN);
  const [updateMut, updateState] = useMutation(UPDATE_POD_PLAN);
  const [deleteMut] = useMutation(DELETE_POD_PLAN);
  const confirm = useConfirm();
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [open, setOpen] = useState(false);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: PLANS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.podPlansTable.rows as PlanRow[], total: data.podPlansTable.total as number };
    },
    [client],
  );

  const onSave = async (values: PodPlanFormValues) => {
    try {
      if (editing) {
        const { key: _key, ...rest } = values;
        await updateMut({ variables: { plan_id: editing.id, input: rest } });
        notifySuccess('Plan updated');
      } else {
        await createMut({ variables: { input: values } });
        notifySuccess('Plan created');
      }
      setOpen(false);
      setEditing(null);
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not save plan');
    }
  };

  const onDelete = async (row: PlanRow) => {
    const ok = await confirm({
      title: 'Delete plan',
      message: `Delete plan "${row.name}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { plan_id: row.id } });
      notifySuccess('Plan deleted');
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete plan');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Pod Plans
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Free, Premium and upcoming plan tiers shown in the mobile web app. Toggle the{' '}
          <code>pod_plans_section</code> feature flag to control visibility.
        </Typography>
      </Box>

      <PodPlansTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New plan
          </Button>
        }
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={onDelete}
      />

      <PodPlanFormDialog
        open={open}
        editing={editing}
        loading={createState.loading || updateState.loading}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={onSave}
      />
    </Stack>
  );
}
