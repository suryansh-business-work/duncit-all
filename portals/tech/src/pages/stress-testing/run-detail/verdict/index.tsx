import { useMutation } from '@apollo/client/react';
import { Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { GENERATE_STRESS_VERDICT, isLiveRun, type StressRun } from '../../queries';
import VerdictBody from './VerdictBody';

interface Props {
  run: StressRun;
}

/**
 * The AI verdict on a finished run. The run's numbers go to OpenAI on request
 * only — a run nobody reads should not cost anything — and the answer is kept
 * on the run, so it is read, downloaded and shared without asking again.
 */
export default function VerdictCard({ run }: Readonly<Props>) {
  const { t } = useTranslation();
  const [generate, { loading }] = useMutation(GENERATE_STRESS_VERDICT);
  const live = isLiveRun(run.status);
  const neverStarted = !live && !run.started_at;

  const onGenerate = async () => {
    try {
      await generate({ variables: { id: run.id } });
      notifySuccess(t('tech.stress.verdictReady'));
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const buttonLabel = run.verdict ? t('tech.stress.verdictRegenerate') : t('tech.stress.verdictGenerate');
  const action = live ? null : (
    <DuncitButton
      variant={run.verdict ? 'outlined' : 'contained'}
      startIcon={<AutoAwesomeIcon />}
      loading={loading}
      disabled={neverStarted}
      onClick={onGenerate}
    >
      {buttonLabel}
    </DuncitButton>
  );

  let emptyText = t('tech.stress.verdictEmpty');
  if (live) emptyText = t('tech.stress.verdictAfterRun');
  else if (neverStarted) emptyText = t('tech.stress.verdictNoLoad');

  return (
    <SectionCard title={t('tech.stress.verdictTitle')} subtitle={t('tech.stress.verdictSubtitle')} action={action}>
      {run.verdict ? (
        <VerdictBody verdict={run.verdict} />
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {loading ? t('tech.stress.verdictWorking') : emptyText}
        </Typography>
      )}
    </SectionCard>
  );
}
