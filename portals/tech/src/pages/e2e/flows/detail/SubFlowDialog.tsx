import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import FlowFormDialog from '../FlowFormDialog';
import {
  E2eSubFlowForm,
  E2E_SUB_FLOW_FORM_ID,
  toSubFlowValues,
  type SubFlowValues,
} from '../e2e-sub-flow';
import { CREATE_E2E_SUB_FLOW, UPDATE_E2E_SUB_FLOW, errorText, type E2eSubFlow } from '../queries';

interface Props {
  flowId: string;
  /** The sub flow being edited; null adds a new one. */
  subFlow: E2eSubFlow | null;
  onClose: () => void;
}

/**
 * Add or edit a sub flow and its steps. Both mutations answer with the whole
 * flow, so the page behind updates from Apollo's cache.
 */
export default function SubFlowDialog({ flowId, subFlow, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [createSubFlow] = useMutation<any>(CREATE_E2E_SUB_FLOW);
  const [updateSubFlow] = useMutation<any>(UPDATE_E2E_SUB_FLOW);

  const submit = async (input: SubFlowValues) => {
    setSaving(true);
    try {
      if (subFlow) {
        await updateSubFlow({ variables: { flow_id: flowId, sub_flow_id: subFlow.id, input } });
      } else {
        await createSubFlow({ variables: { flow_id: flowId, input } });
      }
      notifySuccess(t('tech.e2eFlows.subFlowSaved'));
      onClose();
    } catch (err) {
      notifyError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowFormDialog
      title={subFlow ? t('tech.e2eFlows.editSubFlow') : t('tech.e2eFlows.addSubFlow')}
      formId={E2E_SUB_FLOW_FORM_ID}
      saving={saving}
      onClose={onClose}
      maxWidth="md"
    >
      <E2eSubFlowForm initial={subFlow ? toSubFlowValues(subFlow) : undefined} onSubmit={submit} />
    </FlowFormDialog>
  );
}
