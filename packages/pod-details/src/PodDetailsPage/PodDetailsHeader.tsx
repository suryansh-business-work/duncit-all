import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitButton } from '@duncit/buttons';
import { BackButton } from '@duncit/ui';
import PodStatusChips from '../PodStatusChips';
import type { PodDetailsViewProps } from './types';

interface Props {
  /** The loaded pod — the title, the chips and both actions read from it. */
  pod: any;
  backTo: string;
  backLabel: string;
  actions: PodDetailsViewProps['actions'];
  editTo: PodDetailsViewProps['editTo'];
}

/**
 * Title, state and the actions, as a single block — the chips belong to the
 * heading, not to a separate band under it.
 */
export default function PodDetailsHeader({ pod, backTo, backLabel, actions, editTo }: Readonly<Props>) {
  const navigate = useNavigate();
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        justifyContent: "space-between"
      }}>
      <Stack spacing={1.25} sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            minWidth: 0
          }}>
          <BackButton onClick={() => navigate(backTo)}>{backLabel}</BackButton>
          <Typography variant="h5" component="h1" noWrap sx={{
            fontWeight: 900
          }}>
            {pod.pod_title}
          </Typography>
        </Stack>
        <PodStatusChips pod={pod} />
      </Stack>
      {/* The portal's own action first (admin puts Revoke cancellation
          here), then Edit — editable at every stage, a cancelled pod
          included, so an admin can correct it (or re-route its venue
          slot) after the fact rather than rebuilding it. Edit is absent
          for a console with no editor behind it: a button that navigates
          nowhere reads as a broken page rather than as a permission the
          reader does not have. */}
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}
      >
        {actions(pod)}
        {editTo && (
          <DuncitButton
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => navigate(editTo(pod.id))}
          >
            Edit pod
          </DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
