import { Card, CardContent, Stack, Typography } from '@mui/material';
import type { WaCampaignRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';

interface TileProps {
  label: string;
  value: number;
  hint: string;
  color?: string;
}

/** One counter. Hoisted so it isn't redefined each render (S6478). */
function Tile({ label, value, hint, color }: Readonly<TileProps>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, flex: 1, minWidth: 132 }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="h5" color={color} sx={{
          fontWeight: 900
        }}>
          {value.toLocaleString()}
        </Typography>
        <Typography variant="body2" sx={{
          fontWeight: 700
        }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * What the send actually did. "Skipped" is deliberately its own number rather
 * than folded into failures: nobody was messaged and nothing was billed for
 * those people, which is a different thing from AiSensy refusing a message.
 */
export default function SummaryTiles({ campaign }: Readonly<{ campaign: WaCampaignRow }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1.5} useFlexGap sx={{
      flexWrap: "wrap"
    }}>
      <Tile
        label={t('marketing.whatsappCampaigns.inTheAudience')}
        value={campaign.recipient_count}
        hint="Matched when the send ran"
      />
      <Tile
        label={t('marketing.common.sent')}
        value={campaign.sent_count}
        hint="AiSensy accepted the message"
        color="success.main"
      />
      <Tile
        label={t('marketing.whatsappCampaigns.skipped')}
        value={campaign.skipped_count}
        hint="Nothing attempted — see why below"
        color="warning.main"
      />
      <Tile
        label={t('marketing.common.failed')}
        value={campaign.failed_count}
        hint="AiSensy refused the message"
        color="error.main"
      />
    </Stack>
  );
}
