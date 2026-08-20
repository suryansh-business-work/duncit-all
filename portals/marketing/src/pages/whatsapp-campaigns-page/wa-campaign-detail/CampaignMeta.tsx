import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { categoryLabel, waMoney, waRate } from '../helpers';
import type { WaCampaignRow } from '../queries';
import { formatDateTime } from '@duncit/app-settings';

/** One label/value line. Hoisted so it isn't redefined each render (S6478). */
function MetaRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 150, fontWeight: 700 }}>
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
  const { formatDateTime } = useDateFormat();

  return (
    <Stack spacing={0.75}>
      <MetaRow label="WhatsApp campaign">
        <Typography variant="body2" fontWeight={700}>
          {campaign.wa_campaign_name}
        </Typography>
      </MetaRow>
      <MetaRow label="Target audience">
        <Typography variant="body2">{audienceText}</Typography>
      </MetaRow>
      <MetaRow label="Template">
        <Typography variant="body2">{campaign.template_name || 'Not known'}</Typography>
        <Chip size="small" label={categoryLabel(campaign.template_category)} />
      </MetaRow>
      {/* The rate sits beside the total on purpose: a cost with no rate under
          it cannot be checked against the rate card. */}
      <MetaRow label="Cost">
        <Typography variant="body2" fontWeight={700}>
          {waMoney(campaign.cost, currency)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {costHint(campaign, currency)}
        </Typography>
      </MetaRow>
      <MetaRow label="Template params">
        {campaign.template_params.length > 0 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {campaign.template_params.map((param, index) => (
              // Params are ordered and may repeat, so the position is the only
              // stable identity a row has (S6479).
              <Chip key={`${index}-${param}`} size="small" label={`{{${index + 1}}} ${param}`} />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2">None</Typography>
        )}
      </MetaRow>
      {campaign.scheduled_at && (
        <MetaRow label="Scheduled for">
          <Typography variant="body2">{formatDateTime(campaign.scheduled_at)}</Typography>
        </MetaRow>
      )}
      <MetaRow label="Created">
        <Typography variant="body2">{formatDateTime(campaign.created_at)}</Typography>
      </MetaRow>
      <MetaRow label="Finished">
        <Typography variant="body2">
          {campaign.sent_at ? formatDateTime(campaign.sent_at) : 'Still sending'}
        </Typography>
      </MetaRow>
    </Stack>
  );
}
