import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { PURGE_SHORT_LINK_CLICKS, ROTATE_SHORT_LINK_IP_SALT } from '../queries';

type PrivacyAction = 'ROTATE' | 'PURGE';

/** The key trio behind each confirmation — title, body, button. */
const COPY: Record<PrivacyAction, { title: string; message: string; confirm: string }> = {
  ROTATE: {
    title: 'marketing.externalLinks.rotateSaltTitle',
    message: 'marketing.externalLinks.rotateSaltMessage',
    confirm: 'marketing.externalLinks.rotateSaltConfirm',
  },
  PURGE: {
    title: 'marketing.externalLinks.purgeTitle',
    message: 'marketing.externalLinks.purgeMessage',
    confirm: 'marketing.externalLinks.purgeConfirm',
  },
};

interface Props {
  beyondRetention: number;
  onDone: () => void;
}

/** The two things that act on stored click data rather than describe it. */
export default function PrivacyActions({ beyondRetention, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [action, setAction] = useState<PrivacyAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotate, { loading: rotating }] = useMutation<any>(ROTATE_SHORT_LINK_IP_SALT);
  const [purge, { loading: purging }] = useMutation<any>(PURGE_SHORT_LINK_CLICKS);

  const close = () => {
    setAction(null);
    setError(null);
  };

  const runRotate = async () => {
    await rotate();
    notifySuccess(t('marketing.externalLinks.rotateSaltDone'));
  };

  const runPurge = async () => {
    const result = await purge();
    const removed = Number(result.data?.purgeShortLinkClicks ?? 0);
    notifySuccess(
      t('marketing.externalLinks.purgeDone', { vars: { count: removed.toLocaleString() } }),
    );
  };

  const confirm = async () => {
    setError(null);
    try {
      await (action === 'ROTATE' ? runRotate() : runPurge());
    } catch (e) {
      setError(parseApiError(e, t('marketing.externalLinks.actionFailed')));
      return;
    }
    close();
    onDone();
  };

  const busy = rotating || purging;
  const copy = action ? COPY[action] : null;

  return (
    <SectionCard
      title={t('marketing.externalLinks.dataActions')}
      subtitle={t('marketing.externalLinks.dataActionsHint')}
    >
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <DuncitButton
            variant="outlined"
            startIcon={<AutorenewIcon />}
            onClick={() => setAction('ROTATE')}
            data-testid="privacy-rotate-salt"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('marketing.externalLinks.rotateSalt')}
          </DuncitButton>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('marketing.externalLinks.rotateSaltHint')}
          </Typography>
        </Stack>

        <Stack spacing={0.5}>
          <DuncitButton
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setAction('PURGE')}
            data-testid="privacy-purge-now"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('marketing.externalLinks.purgeNow')}
          </DuncitButton>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('marketing.externalLinks.purgeNowHint', {
              vars: { count: beyondRetention.toLocaleString() },
            })}
          </Typography>
        </Stack>
      </Stack>

      {copy && (
        <ConfirmDialog
          open
          title={t(copy.title)}
          message={error ?? t(copy.message)}
          confirmLabel={t(copy.confirm)}
          confirmColor="error"
          loading={busy}
          busyLabel={t('marketing.externalLinks.actionBusy')}
          onClose={close}
          onConfirm={confirm}
        />
      )}
    </SectionCard>
  );
}
