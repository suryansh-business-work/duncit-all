import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { IntelConnector, IntelTestResult } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { INTEL_BOOTSTRAP } from '../../../graphql/chat';
import {
  INTEL_CREATE_CONNECTOR,
  INTEL_DELETE_CONNECTOR,
  INTEL_DISCOVER_TOOLS,
  INTEL_SET_CONNECTOR_ENABLED,
  INTEL_SET_TOOL_CLASS,
  INTEL_SYNC_CONNECTOR,
  INTEL_TEST_CONNECTOR,
  INTEL_UPDATE_CONNECTOR,
  type TestConnectorData,
} from '../../../graphql/admin';
import type { ConnectorKind, ConnectorValues } from './connector-form';

/** Every connector action, each reporting the server's answer (no silent failures). */
export function useConnectorActions(kind: ConnectorKind, refetch: () => void) {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; result: IntelTestResult } | null>(null);
  const refetchQueries = [INTEL_BOOTSTRAP];
  const [create, createState] = useMutation(INTEL_CREATE_CONNECTOR, { refetchQueries });
  const [update, updateState] = useMutation(INTEL_UPDATE_CONNECTOR, { refetchQueries });
  const [remove] = useMutation(INTEL_DELETE_CONNECTOR, { refetchQueries });
  const [setEnabled] = useMutation(INTEL_SET_CONNECTOR_ENABLED, { refetchQueries });
  const [test, testState] = useMutation<TestConnectorData>(INTEL_TEST_CONNECTOR);
  const [sync] = useMutation(INTEL_SYNC_CONNECTOR);
  const [discover, discoverState] = useMutation(INTEL_DISCOVER_TOOLS);
  const [setToolClass] = useMutation(INTEL_SET_TOOL_CLASS);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      if (done) notifySuccess(done);
      refetch();
    } catch (err) {
      notifyError(parseApiError(err, t('intel.settings.connectors.actionFailed')));
    }
  };

  const input = (values: ConnectorValues) => ({ kind, name: values.name, environment: values.environment, env_entry_id: values.env_entry_id, enabled: values.enabled, config: JSON.stringify(values.config) });

  return {
    formError,
    clearFormError: () => setFormError(null),
    saving: createState.loading || updateState.loading,
    testing: testState.loading,
    discovering: discoverState.loading,
    testResult,
    save: async (editing: IntelConnector | null, values: ConnectorValues): Promise<boolean> => {
      setFormError(null);
      try {
        if (editing) await update({ variables: { id: editing.id, input: input(values) } });
        else await create({ variables: { input: input(values) } });
        notifySuccess(editing ? t('intel.settings.connectors.saved') : t('intel.settings.connectors.created'));
        refetch();
        return true;
      } catch (err) {
        setFormError(parseApiError(err, t('intel.settings.connectors.actionFailed')));
        return false;
      }
    },
    remove: (c: IntelConnector) => run(() => remove({ variables: { id: c.id } }), t('intel.settings.connectors.deleted')),
    toggle: (c: IntelConnector) => run(() => setEnabled({ variables: { id: c.id, enabled: !c.enabled } })),
    sync: (c: IntelConnector, full: boolean) => run(() => sync({ variables: { id: c.id, full } }), t('intel.sync.queued')),
    discover: (c: IntelConnector) => run(() => discover({ variables: { id: c.id } }), t('intel.settings.connectors.discovered')),
    setToolClass: (c: IntelConnector, tool: string, cls: string | null) => run(() => setToolClass({ variables: { id: c.id, tool, class: cls } })),
    test: async (c: IntelConnector) => {
      try {
        const res = await test({ variables: { id: c.id } });
        if (res.data) setTestResult({ id: c.id, result: res.data.intelTestConnector });
        refetch();
      } catch (err) {
        notifyError(parseApiError(err, t('intel.settings.connectors.actionFailed')));
      }
    },
  };
}
