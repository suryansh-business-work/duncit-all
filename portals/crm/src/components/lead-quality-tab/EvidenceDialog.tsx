import { useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { LeadEvidenceForm, leadEvidenceDecision, leadEvidenceDefaults, type LeadEvidenceFormValues } from '../../forms/lead-evidence';
import type { LeadQualityActions } from './useLeadQualityActions';
import { formatPoints } from './qualityFormat';
import type { QualityEvidence, QualityItemResult } from './qualityTypes';

interface Props {
  item: QualityItemResult;
  evidence: QualityEvidence | undefined;
  actions: LeadQualityActions;
  onClose: () => void;
}

/**
 * Records one item's evidence. The dialog stays open with the server's
 * refusals when a decision is not saved, and closes once it is (the score
 * behind it is recalculated by then).
 */
export default function EvidenceDialog({ item, evidence, actions, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [refusals, setRefusals] = useState<string[]>([]);

  const save = async (values: LeadEvidenceFormValues) => {
    setRefusals([]);
    const refused = await actions.record(leadEvidenceDecision(item.key, values));
    if (refused.length > 0) {
      setRefusals(refused);
      return;
    }
    onClose();
  };

  return (
    <LeadEvidenceForm
      open
      itemLabel={t('crm.leadQualityTab.formItem', { vars: { name: item.name, points: formatPoints(item.points) } })}
      initialValues={leadEvidenceDefaults(evidence)}
      submitting={actions.recording}
      errors={refusals}
      onSubmit={(values) => fireAndForget(save(values), logs.portal.crm, 'LeadQualityTab', 'recordEvidence')}
      onClose={onClose}
    />
  );
}
