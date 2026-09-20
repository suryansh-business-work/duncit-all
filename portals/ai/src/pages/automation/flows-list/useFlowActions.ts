import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { DELETE_FLOW, DUPLICATE_FLOW, SAVE_FLOW } from '../queries';
import { NODE_KINDS } from '../node-kinds';
import { CHANNEL_SLUGS, type AutomationChannel, type AutomationFlow } from '../types';
import type { AutomationFlowFormValues } from '../../../forms/automation-flow';

/**
 * Create, duplicate and delete from the list. A new flow is saved with its
 * trigger already on the canvas, so the builder never opens on an empty page.
 */
export function useFlowActions(channel: AutomationChannel, refetch: () => void) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const [save, { loading: creating }] = useMutation<{ saveAutomationFlow: AutomationFlow }>(SAVE_FLOW);
  const [duplicate] = useMutation<{ duplicateAutomationFlow: AutomationFlow }>(DUPLICATE_FLOW);
  const [remove] = useMutation<{ deleteAutomationFlow: boolean }>(DELETE_FLOW);

  const open = useCallback(
    (flow: AutomationFlow) => navigate(`/automation/${CHANNEL_SLUGS[channel]}/${flow.id}`),
    [navigate, channel]
  );

  const create = useCallback(
    async (values: AutomationFlowFormValues) => {
      try {
        const result = await save({
          variables: {
            input: {
              name: values.name,
              description: values.description,
              channel,
              nodes: [
                { id: 'trigger', kind: 'trigger', x: 80, y: 80, data: JSON.stringify(NODE_KINDS.trigger.defaults(channel)) },
              ],
              edges: [],
            },
          },
        });
        const created = result.data?.saveAutomationFlow;
        notifySuccess(t('ai.automation.form.created'));
        setCreateOpen(false);
        if (created) open(created);
      } catch (error) {
        notifyError(parseApiError(error, t('ai.automation.builder.saveFailed')));
      }
    },
    [save, channel, t, open]
  );

  const copy = useCallback(
    async (flow: AutomationFlow) => {
      try {
        await duplicate({ variables: { id: flow.id } });
        notifySuccess(t('ai.automation.list.duplicated'));
        refetch();
      } catch (error) {
        notifyError(parseApiError(error, t('ai.automation.builder.saveFailed')));
      }
    },
    [duplicate, refetch, t]
  );

  const destroy = useCallback(
    async (flow: AutomationFlow) => {
      const ok = await confirm({
        title: t('ai.automation.list.deleteTitle'),
        message: t('ai.automation.list.deleteMessage', { vars: { name: flow.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await remove({ variables: { id: flow.id } });
        notifySuccess(t('ai.automation.list.deleted'));
        refetch();
      } catch (error) {
        notifyError(parseApiError(error, t('ai.automation.builder.saveFailed')));
      }
    },
    [confirm, remove, refetch, t]
  );

  return { createOpen, setCreateOpen, creating, create, open, copy, destroy };
}
