import { useMutation, useQuery } from '@apollo/client/react';
import { List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { isChallengeInPlay } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { useDateFormat } from '../../utils/dateFormat';
import { notifyError, notifySuccess } from '../../components/notify';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { POD_CHALLENGE_NOTIFICATIONS, SEND_POD_CHALLENGE_NOTICE } from './queries';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'status' | 'result'>;
}

/**
 * Send now, resend to failed, and the history. The live link can be sent while
 * the challenge runs and the result link once it is published. The server
 * sends each person a notice once, so "Send now" later only reaches attendees
 * who joined since; "Resend" retries WhatsApp for sends that failed.
 */
export default function HostNotifications({ challenge }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const variables = { id: challenge.id };
  const { data } = useQuery(POD_CHALLENGE_NOTIFICATIONS, { variables, fetchPolicy: 'cache-and-network' });
  const [send, sendState] = useMutation(SEND_POD_CHALLENGE_NOTICE, {
    refetchQueries: [{ query: POD_CHALLENGE_NOTIFICATIONS, variables }],
  });
  const kind = challenge.result ? 'RESULT' : 'LIVE';
  const canSend = challenge.result ? true : isChallengeInPlay(challenge.status);
  const batches = data?.podChallengeNotifications ?? [];
  const sentThisKind = batches.some((b) => b.kind === kind);

  const run = async (retryFailed: boolean) => {
    try {
      const res = await send({ variables: { ...variables, kind, retryFailed } });
      const count = res.data?.sendPodChallengeNotice ?? 0;
      notifySuccess(t(count > 0 ? 'mweb.challenge.noticeSent' : 'mweb.challenge.noticeNobody', { vars: { count } }));
    } catch (error) {
      notifyError((error as Error).message);
    }
  };
  const go = (retryFailed: boolean) => fireAndForget(run(retryFailed), logs.mWeb, 'host-pod-challenges', 'notice');

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <DuncitButton size="small" variant="contained" startIcon={<SendIcon />} disabled={!canSend || sendState.loading} onClick={() => go(false)}>
          {t(kind === 'RESULT' ? 'mweb.challenge.sendResultNow' : 'mweb.challenge.sendLiveNow')}
        </DuncitButton>
        <DuncitButton size="small" startIcon={<ReplayIcon />} disabled={!canSend || !sentThisKind || sendState.loading} onClick={() => go(true)}>
          {t('mweb.challenge.resendFailed')}
        </DuncitButton>
      </Stack>
      {batches.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.challenge.noNotices')}
        </Typography>
      ) : (
        <List dense aria-label={t('mweb.challenge.noticeHistory')} disablePadding>
          {batches.map((b) => (
            <ListItem key={`${b.kind}-${b.version}`} disableGutters divider>
              <ListItemText
                primary={t(b.kind === 'RESULT' ? 'mweb.challenge.noticeResult' : 'mweb.challenge.noticeLive', { vars: { count: b.recipients } })}
                secondary={t('mweb.challenge.noticeChannels', {
                  vars: { whatsapp: b.whatsapp, email: b.email, time: formatDateTime(b.last_sent_at) },
                })}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
