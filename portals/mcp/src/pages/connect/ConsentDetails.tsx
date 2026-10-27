import { Alert, Chip, Stack } from '@mui/material';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { InfoRow } from '@duncit/ui';
import type { AuthorizationRequest } from './queries';

/**
 * Who is asking and where they will send the person back. The app's name and
 * website are what the app registered itself with, so they are shown as plain
 * text, never as a link; the redirect host is the part Duncit can vouch for,
 * and an untrusted one is called out before anyone approves.
 */
export default function ConsentDetails({ request }: Readonly<{ request: AuthorizationRequest }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const trustChip = request.trusted ? (
    <Chip size="small" color="success" variant="outlined" icon={<GppGoodOutlinedIcon />} label={t('mcp.consent.trusted')} />
  ) : (
    <Chip size="small" color="warning" icon={<WarningAmberIcon />} label={t('mcp.consent.untrusted')} />
  );

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <InfoRow variant="inline" labelWidth={160} label={t('mcp.consent.app')} value={request.client_name} />
        {request.client_uri ? (
          <InfoRow variant="inline" labelWidth={160} label={t('mcp.consent.appWebsite')} value={request.client_uri} />
        ) : null}
        <InfoRow
          variant="inline"
          labelWidth={160}
          label={t('mcp.consent.redirect')}
          value={
            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{request.redirect_host}</span>
              {trustChip}
            </Stack>
          }
        />
        <InfoRow variant="inline" labelWidth={160} label={t('mcp.consent.connector')} value={request.endpoint_label} />
        <InfoRow variant="inline" labelWidth={160} label={t('mcp.consent.expires')} value={formatDateTime(request.expires_at)} />
      </Stack>
      {request.trusted ? null : (
        <Alert severity="warning" data-testid="mcp-consent-untrusted">
          {t('mcp.consent.untrustedWarning', { vars: { host: request.redirect_host } })}
        </Alert>
      )}
    </Stack>
  );
}
