import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import type { Edge } from '@xyflow/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { SAVE_FLOW, SET_FLOW_STATUS } from '../queries';
import { toEdgeInputs, toNodeInputs, type CanvasNode } from '../graph-io';
import type { AutomationChannel, AutomationFlow, FlowIssue, FlowStatus } from '../types';

interface Params {
  flowId: string;
  channel: AutomationChannel;
  /** The saved flow came back — issues to paint, status to show. */
  onSaved: (flow: AutomationFlow) => void;
}

/**
 * Save and activate. A save takes any graph and answers with what is still
 * wrong; activation is refused by the server while anything is, and the
 * refusal carries the same list so the canvas can mark the steps.
 */
export function useFlowSave({ flowId, channel, onSaved }: Params) {
  const { t } = useTranslation();
  const [saveMutation, { loading: saving }] = useMutation<{ saveAutomationFlow: AutomationFlow }>(SAVE_FLOW);
  const [statusMutation, { loading: changingStatus }] = useMutation<{ setAutomationFlowStatus: AutomationFlow }>(SET_FLOW_STATUS);

  const save = useCallback(
    async (name: string, description: string, nodes: readonly CanvasNode[], edges: readonly Edge[]): Promise<AutomationFlow | null> => {
      try {
        const result = await saveMutation({
          variables: { input: { id: flowId, name, description, channel, nodes: toNodeInputs(nodes), edges: toEdgeInputs(edges) } },
        });
        const flow = result.data?.saveAutomationFlow ?? null;
        if (flow) {
          onSaved(flow);
          notifySuccess(t('ai.automation.builder.saved'));
        }
        return flow;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.automation.builder.saveFailed')));
        return null;
      }
    },
    [saveMutation, flowId, channel, onSaved, t]
  );

  const setStatus = useCallback(
    async (status: FlowStatus, onIssues: (issues: FlowIssue[]) => void): Promise<boolean> => {
      try {
        const result = await statusMutation({ variables: { id: flowId, status } });
        const flow = result.data?.setAutomationFlowStatus;
        if (flow) {
          onSaved(flow);
          notifySuccess(status === 'ACTIVE' ? t('ai.automation.builder.activated') : t('ai.automation.builder.paused'));
        }
        return !!flow;
      } catch (error) {
        const issues = (error as { graphQLErrors?: Array<{ extensions?: { issues?: FlowIssue[] } }> })?.graphQLErrors?.[0]?.extensions?.issues;
        if (Array.isArray(issues)) onIssues(issues);
        notifyError(parseApiError(error, t('ai.automation.builder.statusFailed')));
        return false;
      }
    },
    [statusMutation, flowId, onSaved, t]
  );

  return { save, setStatus, saving, changingStatus };
}
