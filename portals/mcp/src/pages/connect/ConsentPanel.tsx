import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import ConsentDetails from './ConsentDetails';
import {
  APPROVE_MCP_AUTHORIZATION,
  consentErrorKey,
  DENY_MCP_AUTHORIZATION,
  MCP_AUTHORIZATION_REQUEST,
  type ApproveData,
  type AuthorizationRequestData,
  type DenyData,
} from './queries';

/**
 * The OAuth consent screen: the server's /authorize sends the person here with
 * `?request=<id>`. They see which app is asking and where it sends them back,
 * choose read-only or read & write (off unless they turn it on), and approve or
 * deny — after which the browser goes back to the app with the answer.
 */
export default function ConsentPanel({ requestId }: Readonly<{ requestId: string }>) {
  const { t } = useTranslation();
  const [allowWrite, setAllowWrite] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { data, loading, error } = useQuery<AuthorizationRequestData, { id: string }>(MCP_AUTHORIZATION_REQUEST, {
    variables: { id: requestId },
    fetchPolicy: 'network-only',
  });
  const [approve] = useMutation<ApproveData, { id: string; allow_write: boolean }>(APPROVE_MCP_AUTHORIZATION);
  const [deny] = useMutation<DenyData, { id: string }>(DENY_MCP_AUTHORIZATION);
  const request = data?.mcpAuthorizationRequest;

  const answer = async (decide: () => Promise<string | undefined>) => {
    setFailure(null);
    try {
      const redirectUrl = await decide();
      if (redirectUrl) {
        setLeaving(true);
        globalThis.location.assign(redirectUrl);
      } else {
        setFailure(t('mcp.consent.failed'));
      }
    } catch (err) {
      const key = consentErrorKey(err);
      setFailure(key ? t(key) : parseApiError(err, t('mcp.consent.failed')));
    }
  };
  const onApprove = () =>
    answer(async () => {
      const result = await approve({ variables: { id: requestId, allow_write: allowWrite } });
      return result.data?.approveMcpAuthorization.redirect_url;
    });
  const onDeny = () =>
    answer(async () => {
      const result = await deny({ variables: { id: requestId } });
      return result.data?.denyMcpAuthorization.redirect_url;
    });

  if (loading && !request) return <Loader label={t('mcp.consent.loading')} />;
  if (!request) {
    const key = consentErrorKey(error);
    return (
      <Alert severity="warning" data-testid="mcp-consent-unavailable">
        {key ? t(key) : t('mcp.consent.loadFailed')}
      </Alert>
    );
  }

  const title = t('mcp.consent.title', { vars: { app: request.client_name } });
  return (
    <Card variant="outlined" sx={{ maxWidth: 640 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mcp.consent.subtitle')}
            </Typography>
          </Stack>
          <ConsentDetails request={request} />
          {request.requests_write ? (
            <Stack spacing={0.5}>
              <FormControlLabel
                control={<Switch checked={allowWrite} onChange={(event) => setAllowWrite(event.target.checked)} />}
                label={t('mcp.consent.allowWrite')}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('mcp.consent.allowWriteHint')}
              </Typography>
            </Stack>
          ) : null}
          {request.can_approve ? null : <Alert severity="info">{t('mcp.consent.cannotApprove')}</Alert>}
          {failure ? <Alert severity="error">{failure}</Alert> : null}
          {leaving ? (
            <Alert severity="success" role="status">
              {t('mcp.consent.redirecting', { vars: { app: request.client_name } })}
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <DuncitButton variant="outlined" onClick={onDeny} disabled={leaving}>
              {t('mcp.consent.deny')}
            </DuncitButton>
            {request.can_approve ? (
              <DuncitButton variant="contained" onClick={onApprove} disabled={leaving}>
                {t('mcp.consent.approve')}
              </DuncitButton>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
