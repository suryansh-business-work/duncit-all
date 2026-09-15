import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import KeyIcon from '@mui/icons-material/Key';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { QueryGuard } from '@duncit/ui';
import { copyToClipboard, parseApiError } from '@duncit/utils';
import { formatDateTime, MY_TABLE_API_ACCESS, useTranslation } from '@duncit/app-settings';
import { REVOKE_MY_TABLE_API_TOKEN, ROTATE_MY_TABLE_API_TOKEN } from './queries';

interface TableApiAccessData {
  myTableApiAccess: {
    token: string | null;
    base_url: string;
    created_at: string | null;
    last_used_at: string | null;
  };
}

/**
 * Tech → Table API → Settings: the signed-in person's own token for every
 * portal table's "GET API" URL. The token acts as its owner, so it reads only
 * what that person can already see — and rotating or revoking it retires every
 * URL built from it at once.
 */
export default function TableApiSettingsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, loading, error } = useQuery<TableApiAccessData>(MY_TABLE_API_ACCESS, {
    fetchPolicy: 'cache-and-network',
  });
  const mutationOptions = { refetchQueries: [MY_TABLE_API_ACCESS] };
  const [rotate, rotation] = useMutation(ROTATE_MY_TABLE_API_TOKEN, mutationOptions);
  const [revoke, revocation] = useMutation(REVOKE_MY_TABLE_API_TOKEN, mutationOptions);
  const access = data?.myTableApiAccess;
  const token = access?.token ?? null;
  const busy = rotation.loading || revocation.loading;
  const lastUsed = access?.last_used_at
    ? t('tech.tableApiSettings.lastUsedAt', { vars: { date: formatDateTime(access.last_used_at) } })
    : t('tech.tableApiSettings.neverUsed');
  const sample = token ? `${access?.base_url}/myApiKeysTable?token=${token}&page=1&page_size=25` : '';

  const copy = async () => {
    const copied = await copyToClipboard(token ?? '');
    notify(copied ? t('tech.tableApiSettings.copied') : t('tech.tableApiSettings.copyFailed'), copied ? 'success' : 'error');
  };

  const runRotate = async () => {
    if (token) {
      const ok = await confirm({
        title: t('tech.tableApiSettings.rotateTitle'),
        message: t('tech.tableApiSettings.rotateMessage'),
        confirmLabel: t('tech.tableApiSettings.rotate'),
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await rotate();
      notify(t('tech.tableApiSettings.generated'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const runRevoke = async () => {
    const ok = await confirm({
      title: t('tech.tableApiSettings.revokeTitle'),
      message: t('tech.tableApiSettings.revokeMessage'),
      confirmLabel: t('tech.tableApiSettings.revoke'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await revoke();
      notify(t('tech.tableApiSettings.revoked'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <QueryGuard loading={loading && !data} error={error}>
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6">{t('tech.tableApiSettings.title')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tech.tableApiSettings.intro')}
            </Typography>
            <Alert severity="warning">{t('tech.tableApiSettings.warning')}</Alert>
            <Typography
              variant="body2"
              data-testid="table-api-token"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}
            >
              {token ?? t('tech.tableApiSettings.noToken')}
            </Typography>
            {access?.created_at ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('tech.tableApiSettings.issuedAt', { vars: { date: formatDateTime(access.created_at) } })}
                {' · '}
                {lastUsed}
              </Typography>
            ) : null}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <DuncitButton
                size="small"
                variant="contained"
                startIcon={token ? <AutorenewIcon /> : <KeyIcon />}
                disabled={busy}
                onClick={runRotate}
              >
                {token ? t('tech.tableApiSettings.rotate') : t('tech.tableApiSettings.generate')}
              </DuncitButton>
              <DuncitButton size="small" startIcon={<ContentCopyIcon />} disabled={!token} onClick={copy}>
                {t('tech.tableApiSettings.copy')}
              </DuncitButton>
              <DuncitButton
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                disabled={!token || busy}
                onClick={runRevoke}
              >
                {t('tech.tableApiSettings.revoke')}
              </DuncitButton>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('tech.tableApiSettings.usage')}
            </Typography>
            {sample ? (
              <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {`GET ${sample}`}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </QueryGuard>
  );
}
