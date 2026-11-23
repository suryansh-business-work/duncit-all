import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import type { MutationRecalculateCrmLeadQualityScoresArgs } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog, notify, notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { RECALCULATE_LEAD_QUALITY_SCORES } from '../../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../../api/crm.types';
import { LEAD_KIND_LABEL_KEY } from '../../../lib/leadKinds';

interface RecalcData {
  recalculateCrmLeadQualityScores: { job_id: string | null; total: number };
}

/**
 * The listing toolbar's "Recalculate scores": after a confirm, rescores every
 * lead of this kind as a background job, which shows in the header's jobs
 * drawer like every other long-running task.
 */
export default function RecalculateScoresAction({ entity }: Readonly<{ entity: CrmLeadEntityType }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [start, { loading }] = useMutation<RecalcData, MutationRecalculateCrmLeadQualityScoresArgs>(RECALCULATE_LEAD_QUALITY_SCORES, {
    refetchQueries: ['MyBackgroundJobs'],
  });

  const confirm = async () => {
    try {
      const { data } = await start({ variables: { entity_type: entity } });
      const job = data?.recalculateCrmLeadQualityScores;
      if (job?.job_id) notifySuccess(t('crm.leadQualityTab.recalculateScoresStarted', { count: job.total }));
      else notify(t('crm.leadQualityTab.recalculateScoresNothing'), 'info');
      setOpen(false);
    } catch (err) {
      notifyError(t('crm.leadQualityTab.recalculateScoresFailed', { vars: { reason: parseApiError(err) } }));
    }
  };

  return (
    <>
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<AutorenewIcon />}
        onClick={() => setOpen(true)}
        data-testid="lead-quality-recalculate-all"
      >
        {t('crm.leadQualityTab.recalculateScores')}
      </DuncitButton>
      <ConfirmDialog
        open={open}
        title={t('crm.leadQualityTab.recalculateScoresTitle')}
        message={t('crm.leadQualityTab.recalculateScoresMessage', { vars: { kind: t(LEAD_KIND_LABEL_KEY[entity]) } })}
        confirmLabel={t('crm.leadQualityTab.recalculate')}
        busy={loading}
        onConfirm={() => fireAndForget(confirm(), logs.portal.crm, 'CrmLeadsTable', 'recalculateScores')}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
