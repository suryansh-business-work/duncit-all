import { Stack, Tooltip } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import SendIcon from '@mui/icons-material/Send';
import { DuncitIconButton } from '@duncit/buttons';
import type { CampaignRow } from './helpers';
import { useTranslation } from '@duncit/app-settings';

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
  const { t } = useTranslation();
  const sendLabel = campaign.sendable ? 'Send this campaign' : 'Only a Live campaign can be sent';
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={sendLabel}>
        <span>
          <DuncitIconButton
            size="small"
            color="primary"
            aria-label={sendLabel}
            disabled={!campaign.sendable}
            onClick={() => onSend(campaign)}
          >
            <SendIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('marketing.whatsappCampaigns.sendOneTestMessage')}>
        <span>
          <DuncitIconButton
            size="small"
            aria-label={t('marketing.whatsappCampaigns.sendOneTestMessage')}
            disabled={!campaign.sendable}
            onClick={() => onTest(campaign)}
          >
            <ScienceIcon fontSize="small" />
          </DuncitIconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
