import { useCallback, useId, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Divider, Drawer, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useUserData } from '@duncit/user-context';
import { MARKETING_LEAD, type MarketingLeadDetail } from '../queries';
import { LeadStageChip } from '../leadColumns';
import { canPickOwner, canPromote } from '../roles';
import { useLeadActions } from './useLeadActions';
import LeadDetails from './LeadDetails';
import LeadContacts from './LeadContacts';
import LeadStageButtons from './LeadStageButtons';
import LeadOwnerDialog from './LeadOwnerDialog';
import PromoteDialog from './PromoteDialog';
import LeadNotes from './LeadNotes';
import LeadTimeline from './LeadTimeline';

interface Props {
  /** The lead to show; null when closed. */
  leadId: string | null;
  onClose: () => void;
  /** An action changed the lead — the grid and the cards behind the drawer should read it again too. */
  onChanged: () => void;
}

type Dialog = 'owner' | 'promote' | null;

/** One lead, opened: who they are, how to reach them, where they stand, what was said, and what happened. */
export default function LeadDrawer({ leadId, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const { user } = useUserData();
  const [dialog, setDialog] = useState<Dialog>(null);
  const { data, loading, error, refetch } = useQuery<{ marketingLead: MarketingLeadDetail }>(MARKETING_LEAD, {
    variables: { id: leadId ?? '' },
    skip: !leadId,
    fetchPolicy: 'cache-and-network',
  });
  const lead = data?.marketingLead;

  const changed = useCallback(() => {
    refetch().catch((err: unknown) => notify(parseApiError(err), 'error'));
    onChanged();
  }, [refetch, onChanged]);
  const actions = useLeadActions(leadId ?? '', changed);
  const closeDialog = useCallback(() => setDialog(null), []);

  return (
    <Drawer
      anchor="right"
      open={!!leadId}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 640 } } } }}
    >
      <Stack spacing={2} sx={{ p: 2 }} data-testid="lead-drawer">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ wordBreak: 'break-word' }}>
              {lead ? lead.name : t('marketing.leads.detailsTitle')}
            </Typography>
            {lead && (
              <Box sx={{ mt: 0.5 }}>
                <LeadStageChip stage={lead.stage} t={t} />
              </Box>
            )}
          </Box>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>

        {loading && !lead && <LinearProgress />}
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}

        {lead && (
          <>
            <LeadDetails lead={lead} canChangeOwner={canPickOwner(user?.roles)} onChangeOwner={() => setDialog('owner')} />
            <LeadContacts lead={lead} />
            <LeadStageButtons lead={lead} busy={actions.busy} canPromote={canPromote(user?.roles)} onMove={actions.setStage} onPromote={() => setDialog('promote')} />
            <Divider />
            <LeadNotes notes={lead.notes} busy={actions.busy} onAdd={actions.addNote} />
            <LeadTimeline entries={lead.timeline} />
            {dialog === 'owner' && <LeadOwnerDialog ownerUserId={lead.owner_user_id} busy={actions.busy} onClose={closeDialog} onSave={actions.assignOwner} />}
            {dialog === 'promote' && <PromoteDialog lead={lead} busy={actions.busy} onClose={closeDialog} onPromote={actions.promote} />}
          </>
        )}
      </Stack>
    </Drawer>
  );
}
