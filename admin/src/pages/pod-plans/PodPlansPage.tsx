import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { notifyError, notifySuccess } from '../../components/notify';
import PodPlanFormDialog, { type PodPlanFormValues } from './PodPlanFormDialog';
import PodPlansTable, { type PlanRow } from './PodPlansTable';
import { CREATE_POD_PLAN, DELETE_POD_PLAN, PLANS, UPDATE_POD_PLAN } from './queries';

export default function PodPlansPage() {
  const { data, loading, error, refetch } = useQuery(PLANS, {
    fetchPolicy: 'cache-and-network',
  });
  const [createMut, createState] = useMutation(CREATE_POD_PLAN);
  const [updateMut, updateState] = useMutation(UPDATE_POD_PLAN);
  const [deleteMut] = useMutation(DELETE_POD_PLAN);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [open, setOpen] = useState(false);

  const rows: PlanRow[] = useMemo(() => data?.podPlans ?? [], [data]);

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
      await refetch();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not save plan');
    }
  };

  const onDelete = async (row: PlanRow) => {
    if (!window.confirm(`Delete plan "${row.name}"?`)) return;
    try {
      await deleteMut({ variables: { plan_id: row.id } });
      notifySuccess('Plan deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message ?? 'Could not delete plan');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Pod Plans
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Free, Premium and upcoming plan tiers shown in the mobile web app. Toggle the{' '}
              <code>pod_plans_section</code> feature flag to control visibility.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            New plan
          </Button>
        </Stack>

        <PodPlansTable
          loading={loading}
          hasData={!!data}
          error={error ?? null}
          rows={rows}
          onEdit={(row) => {
            setEditing(row);
            setOpen(true);
          }}
          onDelete={onDelete}
        />
      </CardContent>

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
    </Card>
  );
}
