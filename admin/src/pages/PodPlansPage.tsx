import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { notifyError, notifySuccess } from '../components/notify';
import PodPlanFormDialog, { type PodPlanFormValues } from './pod-plans/PodPlanFormDialog';

const PLANS = gql`
  query PodPlans {
    podPlans {
      id
      key
      name
      description
      image_url
      features
      price_label
      is_coming_soon
      sort_order
      is_active
      updated_at
    }
  }
`;

const CREATE = gql`
  mutation CreatePodPlan($input: PodPlanInput!) {
    createPodPlan(input: $input) {
      id
    }
  }
`;

const UPDATE = gql`
  mutation UpdatePodPlan($plan_id: ID!, $input: PodPlanUpdateInput!) {
    updatePodPlan(plan_id: $plan_id, input: $input) {
      id
    }
  }
`;

const DELETE = gql`
  mutation DeletePodPlan($plan_id: ID!) {
    deletePodPlan(plan_id: $plan_id)
  }
`;

interface PlanRow extends PodPlanFormValues {
  id: string;
  updated_at?: string;
}

export default function PodPlansPage() {
  const { data, loading, error, refetch } = useQuery(PLANS, {
    fetchPolicy: 'cache-and-network',
  });
  const [createMut, createState] = useMutation(CREATE);
  const [updateMut, updateState] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Pod Plans
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Free, Premium and upcoming plan tiers shown in the mobile web app.
              Toggle the <code>pod_plans_section</code> feature flag to control
              visibility.
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

        {loading && !data ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Price label</TableCell>
                <TableCell>Features</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {r.image_url && (
                        <Box
                          component="img"
                          src={r.image_url}
                          alt=""
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1,
                            objectFit: 'cover',
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {r.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.description?.slice(0, 60)}
                          {r.description && r.description.length > 60 ? '…' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <code>{r.key}</code>
                  </TableCell>
                  <TableCell>{r.price_label || '—'}</TableCell>
                  <TableCell>{(r.features ?? []).length}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip
                        size="small"
                        label={r.is_active ? 'Active' : 'Inactive'}
                        color={r.is_active ? 'success' : 'default'}
                      />
                      {r.is_coming_soon && (
                        <Chip size="small" label="Coming soon" color="warning" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => onDelete(r)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No plans yet. Click <strong>New plan</strong> to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
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
