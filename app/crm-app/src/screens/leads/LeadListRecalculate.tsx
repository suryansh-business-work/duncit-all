import { useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LeadKind } from '@/features/leads/leadKinds';
import { CrmAppRecalculateLeadScoresDocument } from '@/graphql/leadLists';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

interface Props {
  open: boolean;
  kind: LeadKind;
  onClose: () => void;
  /** The job started (or there was nothing to score): what to tell the person. */
  onDone: (message: string) => void;
}

/**
 * The listing's "Recalculate scores": after a confirm, every lead of this
 * kind is rescored as a background job (the portal's RecalculateScoresAction).
 */
export function LeadListRecalculate({ open, kind, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancel = () => {
    setError(null);
    onClose();
  };
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { recalculateCrmLeadQualityScores: job } = await gqlRequest(
        CrmAppRecalculateLeadScoresDocument,
        {
          entity_type: kind,
        },
      );
      onDone(
        job.job_id
          ? t('crm.leadQualityTab.recalculateScoresStarted', { count: job.total })
          : t('crm.leadQualityTab.recalculateScoresNothing'),
      );
    } catch (err) {
      setError(
        t('crm.leadQualityTab.recalculateScoresFailed', {
          vars: { reason: errorMessage(err, t('crmApp.common.saveFailed')) },
        }),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog
      open={open}
      title={t('crm.leadQualityTab.recalculateScoresTitle')}
      message={t('crm.leadQualityTab.recalculateScoresMessage', {
        vars: { kind: t(`crmApp.kind.${kind}`) },
      })}
      confirmLabel={t('crm.leadQualityTab.recalculate')}
      cancelLabel={t('shell.common.cancel')}
      busy={busy}
      error={error}
      onConfirm={() =>
        fireAndForget(confirm(), logs.mobileApp, 'crm-app/LeadListRecalculate', 'confirm')
      }
      onCancel={cancel}
      testID="recalculate-dialog"
    />
  );
}
