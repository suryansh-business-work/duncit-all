import { useId } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box, Drawer, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { CLOSED } from '../copy';
import { DELETE_IG_LEAD, SET_IG_LEAD_STATUS, type IgLead, type IgLeadStatus } from '../queries';
import LeadProfile from './LeadProfile';
import LeadComposer from './LeadComposer';

interface Props {
  lead: IgLead | null;
  onClose: () => void;
  /** The lead as the server now has it; null once deleted. */
  onChanged: (lead: IgLead | null) => void;
}

/** One lead: who they are, what was sent, the next message, and where it stands. */
export default function LeadDrawer({ lead, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const confirm = useConfirm();
  const [statusMut, { loading: saving }] = useMutation<{ setIgLeadStatus: IgLead }>(SET_IG_LEAD_STATUS);
  const [deleteMut] = useMutation(DELETE_IG_LEAD);

  // The buttons exist only while a lead is open, so each hands in the lead it acts on.
  const setStatus = async (current: IgLead, status: IgLeadStatus) => {
    try {
      const { data } = await statusMut({ variables: { id: current.id, status } });
      if (data) onChanged(data.setIgLeadStatus);
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const remove = async (current: IgLead) => {
    if (!(await confirm({ title: t('marketing.igLeads.deleteTitle'), message: `@${current.username}`, destructive: true }))) return;
    try {
      await deleteMut({ variables: { id: current.id } });
      onChanged(null);
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const closed = lead ? CLOSED.includes(lead.status) : false;
  const reopenTo: IgLeadStatus = lead && lead.messages.length > 0 ? 'CONTACTED' : 'NEW';

  return (
    <Drawer
      anchor="right"
      open={!!lead}
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 560 } } } }}
    >
      {lead && (
        <Stack spacing={2} sx={{ p: 2 }} data-testid="ig-lead-drawer">
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id={titleId} variant="h6" component="h2" noWrap>
                @{lead.username}
              </Typography>
            </Box>
            <Tooltip title={t('marketing.igLeads.deleteLead')}>
              <DuncitIconButton onClick={() => remove(lead)}>
                <DeleteOutlinedIcon />
              </DuncitIconButton>
            </Tooltip>
            <Tooltip title={t('shell.common.close')}>
              <DuncitIconButton onClick={onClose}>
                <CloseIcon />
              </DuncitIconButton>
            </Tooltip>
          </Stack>

          <LeadProfile lead={lead} />

          {closed ? (
            <DuncitButton variant="outlined" disabled={saving} onClick={() => setStatus(lead, reopenTo)}>
              {t('marketing.igLeads.reopen')}
            </DuncitButton>
          ) : (
            <>
              <LeadComposer lead={lead} onChanged={onChanged} />
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <DuncitButton variant="outlined" color="success" disabled={saving} onClick={() => setStatus(lead, 'REPLIED')}>
                  {t('marketing.igLeads.markReplied')}
                </DuncitButton>
                <DuncitButton variant="outlined" disabled={saving} onClick={() => setStatus(lead, 'CONVERTED')}>
                  {t('marketing.igLeads.markConverted')}
                </DuncitButton>
                <DuncitButton variant="outlined" color="error" disabled={saving} onClick={() => setStatus(lead, 'LOST')}>
                  {t('marketing.igLeads.markLost')}
                </DuncitButton>
              </Stack>
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
