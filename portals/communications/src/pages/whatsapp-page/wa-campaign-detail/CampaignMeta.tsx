import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { categoryLabel, waMoney, waRate } from '../helpers';
import type { WaCampaignRow } from '../queries';

/** One label/value line. Hoisted so it isn't redefined each render (S6478). */
function MetaRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "baseline",
        flexWrap: "wrap"
      }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          minWidth: 150,
          fontWeight: 700
        }}>
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

/** How the cost was arrived at. A send whose category AiSensy never returned
 * has no rate, and saying so beats printing a confident zero. */
function costHint(campaign: WaCampaignRow, currency: string): string {
  if (campaign.msg_rate <= 0) {
    return 'No rate — AiSensy did not say which category this template is.';
  }
  return `${waRate(campaign.msg_rate, currency)}/msg × ${campaign.sent_count.toLocaleString()} sent`;
}

interface Props {
  campaign: WaCampaignRow;
  /** Audience kind and, for a saved list, its name. */
  audienceText: string;
  currency: string;
}

/** What this send was made of: the template it used, who it was pointed at,
 * what filled its variables, and what it cost. */
export default function CampaignMeta({ campaign, audienceText, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  return (
    <Stack spacing={0.75}>
      <MetaRow label={t('marketing.whatsappCampaigns.whatsappCampaign')}>
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          {campaign.wa_campaign_name}
        </Typography>
      </MetaRow>
      <MetaRow label={t('marketing.common.targetAudience')}>
        <Typography variant="body2">{audienceText}</Typography>
      </MetaRow>
      <MetaRow label={t('marketing.whatsappCampaigns.template')}>
        <Typography variant="body2">{campaign.template_name || 'Not known'}</Typography>
        <Chip size="small" label={categoryLabel(campaign.template_category)} />
      </MetaRow>
      {/* The rate sits beside the total on purpose: a cost with no rate under
          it cannot be checked against the rate card. */}
      <MetaRow label={t('marketing.common.cost')}>
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          {waMoney(campaign.cost, currency)}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {costHint(campaign, currency)}
        </Typography>
      </MetaRow>
      {campaign.scheduled_at && (
        <MetaRow label={t('marketing.whatsappCampaigns.scheduledFor')}>
          <Typography variant="body2">{formatDateTime(campaign.scheduled_at)}</Typography>
        </MetaRow>
      )}
      <MetaRow label={t('shell.common.created')}>
        <Typography variant="body2">{formatDateTime(campaign.created_at)}</Typography>
      </MetaRow>
      <MetaRow label={t('marketing.whatsappCampaigns.finished')}>
        <Typography variant="body2">
          {campaign.sent_at ? formatDateTime(campaign.sent_at) : 'Still sending'}
        </Typography>
      </MetaRow>
    </Stack>
  );
}
