import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import BrandPickupRow from './BrandPickupRow';
import {
  BRAND_PICKUP_LOCATIONS,
  DELETE_BRAND_PICKUP_LOCATION,
  REGISTER_BRAND_PICKUP_WITH_SHIPROCKET,
  SAVE_BRAND_PICKUP_LOCATION,
  SET_DEFAULT_BRAND_PICKUP_LOCATION,
} from './queries';
import {
  PickupLocationForm,
  toFormValues,
  toSubmitInput,
  type PickupLocationFormValues,
} from './pickup-location-form';

interface Props {
  brandId: string;
}

export default function BrandPickupPanel({ brandId }: Readonly<Props>) {
  const variables = { owner_kind: 'BRAND', brand_doc_id: brandId };
  const { data, loading, error, refetch } = useQuery(BRAND_PICKUP_LOCATIONS, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation(SAVE_BRAND_PICKUP_LOCATION);
  const [remove, { loading: removing }] = useMutation(DELETE_BRAND_PICKUP_LOCATION);
  const [setDefault, { loading: settingDefault }] = useMutation(SET_DEFAULT_BRAND_PICKUP_LOCATION);
  const [register, { loading: registering }] = useMutation(REGISTER_BRAND_PICKUP_WITH_SHIPROCKET);

  const [editing, setEditing] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const busy = saving || removing || settingDefault || registering;
  const locations = data?.brandPickupLocations ?? [];

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      await refetch(variables);
      notifySuccess(label);
    } catch (actionError) {
      notifyError(actionError instanceof Error ? actionError.message : 'Action failed');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (location: any) => {
    setEditing(location);
    setDialogOpen(true);
  };

  const submit = async (values: PickupLocationFormValues) => {
    const input = toSubmitInput(values, { owner_kind: 'BRAND', brand_id: brandId });
    await save({ variables: { id: editing?.id ?? null, input } });
    await refetch(variables);
    setDialogOpen(false);
    notifySuccess('Pickup location saved');
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          Pickup / warehouse locations
        </Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add location
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      {loading && locations.length === 0 ? (
        <Box sx={{ py: 2 }}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {locations.length === 0 && (
            <Alert severity="info">No pickup locations yet. Add one to enable SHIP fulfilment.</Alert>
          )}
          {locations.map((location: any) => (
            <BrandPickupRow
              key={location.id}
              location={location}
              busy={busy}
              onEdit={() => openEdit(location)}
              onDelete={() => runAction('Pickup location deleted', () => remove({ variables: { id: location.id } }))}
              onSetDefault={() =>
                runAction('Default pickup location updated', () => setDefault({ variables: { id: location.id } }))
              }
              onRegister={() =>
                runAction('Registered with ShipRocket', () => register({ variables: { id: location.id } }))
              }
            />
          ))}
        </Stack>
      )}

      <PickupLocationForm
        open={dialogOpen}
        title={editing ? 'Edit pickup location' : 'Add pickup location'}
        initialValues={toFormValues(editing)}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
      />
    </Stack>
  );
}
