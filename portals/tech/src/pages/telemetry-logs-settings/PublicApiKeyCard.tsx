import { useMutation, useQuery } from '@apollo/client';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { copyToClipboard, parseApiError } from '@duncit/utils';
import { useUserData } from '@duncit/user-context';
import { serverOrigin } from '../../components/CopyGetApiButton';
import { SUPER_ROLE } from '../../lib/session';
import { ROTATE_TELEMETRY_API_KEY, TELEMETRY_SETTINGS } from './queries';
import { useTranslation } from '@duncit/app-settings';

/**
 * The key inside every "Copy GET API" URL.
 *
 * Those feeds carry no login, which is the point — a copied URL has to work in
 * a browser tab, a monitor or a `curl` with nothing else set up. This string is
 * therefore the entire boundary around every stack trace, address, email and
 * phone number telemetry has recorded. Rotating it is instant and total: every
 * URL copied before the rotation stops working, including ones somebody else
 * is relying on.
 */
export default function PublicApiKeyCard() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { user } = useUserData();
  const { data } = useQuery<{ telemetrySettings: { public_api_key: string } }>(TELEMETRY_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [rotate, { loading }] = useMutation(ROTATE_TELEMETRY_API_KEY, {
    refetchQueries: [TELEMETRY_SETTINGS],
  });
  const key = data?.telemetrySettings?.public_api_key ?? '';
  const sample = key ? `${serverOrigin()}/telemetry/logs.json?key=${key}&level=error` : '';
  const canRotate = user?.roles?.includes(SUPER_ROLE) ?? false;

  const copy = async () => {
    const ok = await copyToClipboard(sample);
    notify(ok ? 'Feed URL copied' : 'Could not copy the URL', ok ? 'success' : 'error');
  };

  const runRotate = async () => {
    const ok = await confirm({
      title: t('tech.telemetryLogsSettings.rotateTheTelemetryFeedKey'),
      message: t('tech.telemetryLogsSettings.everyGetApiUrlCopiedSo'),
      confirmLabel: t('tech.telemetryLogsSettings.rotate'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await rotate();
      notify('New key in place — copy fresh URLs where you need them', 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">{t('tech.telemetryLogsSettings.publicJsonFeeds')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            The Bugs and Logs sections each offer a “Copy GET API” button. The URL it gives you
            returns the same rows as JSON and needs no login — the key below is what stands in for
            one.
          </Typography>
          <Alert severity="warning">
            Treat a copied URL as a password. It exposes stack traces, page URLs, IP addresses,
            emails and phone numbers to anyone who has it.
          </Alert>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'action.hover',
            }}
          >
            {sample || 'Loading…'}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{
            flexWrap: "wrap"
          }}>
            <DuncitButton size="small" startIcon={<ContentCopyIcon />} disabled={!key} onClick={copy}>
              Copy example URL
            </DuncitButton>
            {/* Rotation is SUPER_ADMIN-only on the server (it retires every URL
                anyone is already polling), so a Tech Manager is not shown a
                button whose click could only end in Access Denied. */}
            {canRotate ? (
              <DuncitButton
                size="small"
                color="error"
                startIcon={<AutorenewIcon />}
                disabled={loading}
                onClick={runRotate}
              >
                {loading ? 'Rotating…' : 'Rotate key'}
              </DuncitButton>
            ) : null}
          </Stack>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Filters go on the URL: <code>level</code>, <code>environment</code>, <code>source</code>,{' '}
            <code>user_id</code>, <code>session_id</code>, <code>since_hours</code> and{' '}
            <code>limit</code> for logs; <code>status</code>, <code>source</code> and{' '}
            <code>limit</code> for bugs.
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
