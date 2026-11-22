import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitRoundButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import type { DraftAutosaveHandle } from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import DraftSaveIndicator from './DraftSaveIndicator';

/**
 * The calm page header: round accent mark, the title alone, the draft's save
 * state in the corner and a round close button — the native StackScreen
 * header's twin (rule 27). Close saves the draft first; only when that save
 * fails does it ask before leaving, so nothing typed is lost unawares.
 */
export default function CreatePodHeader({ autosave }: Readonly<{ autosave: DraftAutosaveHandle | null }>) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { t } = useTranslation();

  const close = async () => {
    const saved = autosave ? await autosave.flush() : true;
    const leave =
      saved ||
      (await confirm({
        title: t('mweb.createPod.autosave.leaveTitle'),
        message: t('mweb.createPod.autosave.leaveMessage'),
        confirmLabel: t('mweb.createPod.autosave.leave'),
        cancelLabel: t('mweb.createPod.autosave.stay'),
        destructive: true,
      }));
    if (leave) navigate('/host/manage');
  };

  return (
    <StudioPageHeader
      icon={<AddCircleOutlineIcon fontSize="small" />}
      title={t('mweb.createPod.title')}
      action={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <DraftSaveIndicator status={autosave?.status ?? 'idle'} />
          <DuncitRoundButton
            data-testid="create-pod-page-close"
            tone="paper"
            size="large"
            aria-label={t('mweb.auth.close')}
            onClick={() => {
              close().catch((error: unknown) => logs.mWeb.warn('create-pod', 'close', { error }));
            }}
          >
            <CloseIcon />
          </DuncitRoundButton>
        </Stack>
      }
    />
  );
}
