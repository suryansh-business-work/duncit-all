import { useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import ChallengeResultCard from '../../components/pod-challenge/ChallengeResultCard';
import ChallengeStandings from '../../components/pod-challenge/ChallengeStandings';
import type { PodChallengeView } from '../../components/pod-challenge/queries';
import { ReasonDialog } from './reason-form';
import type { HostChallengeActions } from './useHostChallengeActions';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'pod_id' | 'name' | 'status' | 'standings' | 'result' | 'viewer'>;
  actions: HostChallengeActions;
}

/**
 * Finalize & Publish. The host reviews the final standings and confirms; the
 * published result is then locked. Only Challenge staff can publish a
 * correction afterwards, with a reason, as a new version.
 */
export default function HostResultPanel({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [correcting, setCorrecting] = useState(false);

  const publish = async () => {
    const ok = await confirm({
      title: t('mweb.challenge.publishTitle'),
      message: t('mweb.challenge.publishBody', { vars: { name: challenge.name } }),
      confirmLabel: t('mweb.challenge.publish'),
      cancelLabel: t('mweb.challenge.cancel'),
    });
    if (ok) await actions.publish();
  };

  if (challenge.result) {
    return (
      <Stack spacing={1.5}>
        <ChallengeResultCard challenge={challenge} />
        {challenge.viewer.is_staff && (
          <DuncitButton size="small" color="error" onClick={() => setCorrecting(true)} sx={{ alignSelf: 'flex-start' }}>
            {t('mweb.challenge.publishCorrection')}
          </DuncitButton>
        )}
        <ReasonDialog
          open={correcting}
          title={t('mweb.challenge.publishCorrection')}
          message={t('mweb.challenge.correctionBody')}
          confirmLabel={t('mweb.challenge.publish')}
          required
          saving={actions.busy}
          onClose={() => setCorrecting(false)}
          onSubmit={async ({ reason }) => {
            if (await actions.publish(reason)) setCorrecting(false);
          }}
        />
      </Stack>
    );
  }
  return (
    <Stack spacing={1.5}>
      <Alert severity="info">{t('mweb.challenge.reviewBeforePublish')}</Alert>
      <ChallengeStandings standings={challenge.standings} />
      <DuncitButton
        variant="contained"
        disabled={actions.busy || !challenge.standings.length}
        onClick={() => fireAndForget(publish(), logs.mWeb, 'host-pod-challenges', 'publish')}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('mweb.challenge.finalizePublish')}
      </DuncitButton>
    </Stack>
  );
}
