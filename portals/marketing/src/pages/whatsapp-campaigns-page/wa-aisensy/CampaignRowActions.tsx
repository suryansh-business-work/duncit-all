import { IconButton, Stack, Tooltip } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import SendIcon from '@mui/icons-material/Send';
import type { CampaignRow } from './helpers';

interface Props {
  campaign: CampaignRow;
  onSend: (campaign: CampaignRow) => void;
  onTest: (campaign: CampaignRow) => void;
}

/**
 * Send, and send one test first. Disabled rather than hidden on a campaign
 * AiSensy does not call Live: somebody looking for Send needs to be told why it
 * is unavailable, not left hunting for it.
 */
export default function CampaignRowActions({ campaign, onSend, onTest }: Readonly<Props>) {
  const sendLabel = campaign.sendable ? 'Send this campaign' : 'Only a Live campaign can be sent';
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={sendLabel}>
        <span>
          <IconButton
            size="small"
            color="primary"
            aria-label={sendLabel}
            disabled={!campaign.sendable}
            onClick={() => onSend(campaign)}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Send one test message">
        <span>
          <IconButton
            size="small"
            aria-label="Send one test message"
            disabled={!campaign.sendable}
            onClick={() => onTest(campaign)}
          >
            <ScienceIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
