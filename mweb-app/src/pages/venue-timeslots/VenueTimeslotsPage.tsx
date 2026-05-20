import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BlockIcon from '@mui/icons-material/Block';
import TuneIcon from '@mui/icons-material/Tune';
import { useConfirm } from '../../components/useConfirm';
import { notify } from '../../components/notify';
import SlotTemplateCard, { type TemplateRow } from './components/SlotTemplateCard';
import SlotCalendarPreview from './components/SlotCalendarPreview';
import BlockedRangeList from './components/BlockedRangeList';
import { SlotTemplateForm } from './slot-template-form';
import { BlockSlotForm } from './block-slot-form';
import { CapacityOverrideForm } from './capacity-override-form';
import { useVenueTimeslots } from './hooks/useVenueTimeslots';

const MY_VENUE_ID = gql`
  query MyVenueIdForTimeslots {
    myVenue {
      id
      venue_name
    }
  }
`;

type DialogMode = 'none' | 'create' | 'edit' | 'block' | 'override';

export default function VenueTimeslotsPage() {
  const params = useParams<{ venueId?: string }>();
  const ownVenue = useQuery(MY_VENUE_ID, { skip: !!params.venueId });
  const venueId = params.venueId ?? ownVenue.data?.myVenue?.id ?? null;

  const confirm = useConfirm();
  const ts = useVenueTimeslots(venueId);

  const [mode, setMode] = useState<DialogMode>('none');
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const close = () => {
    setMode('none');
    setEditingTemplate(null);
    setErrorMessage(null);
  };

  const templateOptions = useMemo(
    () =>
      (ts.templates as TemplateRow[]).map((t) => ({
        id: t.id,
        label: t.label || `${t.start_time} slot`,
      })),
    [ts.templates],
  );

  const submitCreate = async (input: any) => {
    setErrorMessage(null);
    try {
      await ts.createTemplate({ variables: { venue_id: venueId, input } });
      await ts.refetchAll();
      notify('Slot created', 'success');
      close();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to create slot');
    }
  };
  const submitUpdate = async (input: any) => {
    if (!editingTemplate) return;
    setErrorMessage(null);
    try {
      await ts.updateTemplate({ variables: { template_id: editingTemplate.id, input } });
      await ts.refetchAll();
      notify('Slot updated', 'success');
      close();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to update slot');
    }
  };
  const submitBlock = async (input: any) => {
    setErrorMessage(null);
    try {
      await ts.blockSlot({ variables: { venue_id: venueId, input } });
      await ts.refetchAll();
      notify('Time range blocked', 'success');
      close();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to block');
    }
  };
  const submitOverride = async (input: any) => {
    setErrorMessage(null);
    try {
      await ts.overrideCapacity({ variables: { venue_id: venueId, ...input } });
      await ts.refetchAll();
      notify('Override saved', 'success');
      close();
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to save override');
    }
  };

  const deleteTemplate = async (template: TemplateRow) => {
    const ok = await confirm({
      title: 'Delete slot',
      message: `Delete slot "${template.label || template.start_time}"? Existing bookings keep their record.`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await ts.deleteTemplate({ variables: { template_id: template.id } });
    await ts.refetchAll();
    notify('Slot deleted', 'success');
  };
  const toggleActive = async (template: TemplateRow, next: boolean) => {
    await ts.setActive({ variables: { template_id: template.id, active: next } });
    await ts.refetchAll();
  };
  const unblock = async (block: { id: string }) => {
    const ok = await confirm({
      title: 'Unblock',
      message: 'Restore this blocked range?',
      confirmLabel: 'Unblock',
    });
    if (!ok) return;
    await ts.unblockSlot({ variables: { block_id: block.id } });
    await ts.refetchAll();
    notify('Block removed', 'success');
  };

  if (!venueId) {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', p: 2 }}>
        <Alert severity="info">
          Register a venue first to manage timeslots.{' '}
          <Button component={RouterLink} to="/venues/manage" variant="text">
            Go to Venue Studio
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 760, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 0 } }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton component={RouterLink} to="/venues/manage" size="small">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 950, flex: 1 }}>
          Manage timeslots
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setMode('create')}
        >
          Add slot
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<BlockIcon />}
          onClick={() => setMode('block')}
        >
          Block range
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TuneIcon />}
          onClick={() => setMode('override')}
        >
          Override day
        </Button>
      </Stack>

      {ts.loading && !ts.templates.length ? (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={22} />
        </Stack>
      ) : (
        <Stack spacing={1}>
          {ts.templates.length === 0 && (
            <Alert severity="info">No slots yet. Add your first slot to start accepting bookings.</Alert>
          )}
          {(ts.templates as TemplateRow[]).map((template) => (
            <SlotTemplateCard
              key={template.id}
              template={template}
              onEdit={(t) => {
                setEditingTemplate(t);
                setMode('edit');
              }}
              onDelete={deleteTemplate}
              onToggleActive={toggleActive}
            />
          ))}
        </Stack>
      )}

      <Divider />

      <Typography variant="subtitle1" fontWeight={900}>
        Blocks
      </Typography>
      <BlockedRangeList
        blocks={ts.blocks}
        onUnblock={unblock}
        templateLabelById={(id) =>
          id ? templateOptions.find((t) => t.id === id)?.label ?? 'Specific slot' : 'All slots'
        }
      />

      <Divider />

      <SlotCalendarPreview instances={ts.instances} loading={ts.loading} />

      <Dialog open={mode === 'create' || mode === 'edit'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>{mode === 'edit' ? 'Edit slot' : 'Add slot'}</DialogTitle>
        <DialogContent>
          <SlotTemplateForm
            initial={editingTemplate}
            submitting={ts.saving}
            errorMessage={errorMessage}
            onSubmit={mode === 'edit' ? submitUpdate : submitCreate}
            onCancel={close}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'block'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Block a range</DialogTitle>
        <DialogContent>
          <BlockSlotForm
            templates={templateOptions}
            submitting={ts.saving}
            errorMessage={errorMessage}
            onSubmit={submitBlock}
            onCancel={close}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'override'} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle>Override a day</DialogTitle>
        <DialogContent>
          <CapacityOverrideForm
            templates={templateOptions}
            submitting={ts.saving}
            errorMessage={errorMessage}
            onSubmit={submitOverride}
            onCancel={close}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
