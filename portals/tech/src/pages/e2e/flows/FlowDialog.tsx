import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import FlowFormDialog from './FlowFormDialog';
import { E2eFlowForm, E2E_FLOW_FORM_ID, type FlowValues } from './e2e-flow';
import { CREATE_E2E_FLOW, UPDATE_E2E_FLOW, errorText, type E2eFlowRow } from './queries';

interface Props {
  /** The flow being edited; null adds a new one. */
  flow: E2eFlowRow | null;
  onClose: () => void;
  /** Called after a successful save, before the dialog closes. */
  onSaved?: () => void;
}

/** Add or rename a flow. Mount it only while it should be open. */
export default function FlowDialog({ flow, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [createFlow] = useMutation<any>(CREATE_E2E_FLOW);
  const [updateFlow] = useMutation<any>(UPDATE_E2E_FLOW);

  const submit = async (input: FlowValues) => {
    setSaving(true);
    try {
      if (flow) await updateFlow({ variables: { id: flow.id, input } });
      else await createFlow({ variables: { input } });
      notifySuccess(t('tech.e2eFlows.flowSaved'));
      onSaved?.();
      onClose();
    } catch (err) {
      notifyError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const initial = flow ? { name: flow.name, description: flow.description } : undefined;
  return (
    <FlowFormDialog
      title={flow ? t('tech.e2eFlows.editFlow') : t('tech.e2eFlows.addFlow')}
      formId={E2E_FLOW_FORM_ID}
      saving={saving}
      onClose={onClose}
    >
      <E2eFlowForm initial={initial} onSubmit={submit} />
    </FlowFormDialog>
  );
}
