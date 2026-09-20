import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { Edge } from '@xyflow/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { AutomationContactFormValues } from '../../../forms/automation-contact';
import { RESUME_TEST, START_TEST } from '../queries';
import { toEdgeInputs, toNodeInputs, type CanvasNode } from '../graph-io';
import type { AutomationChannel, AutomationRun, FlowIssue } from '../types';

const CONTACT_KEY = 'ai_automation_test_contact';

/** The tester's own details, remembered on this device so they are typed once. */
export function rememberedContact(): Partial<AutomationContactFormValues> | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(CONTACT_KEY);
    return raw ? (JSON.parse(raw) as Partial<AutomationContactFormValues>) : undefined;
  } catch {
    return undefined;
  }
}

function rememberContact(values: AutomationContactFormValues): void {
  try {
    const { name, phone, email } = values;
    globalThis.localStorage?.setItem(CONTACT_KEY, JSON.stringify({ name, phone, email }));
  } catch {
    // A private window or blocked storage: the form simply starts blank next time.
  }
}

interface Params {
  flowId: string;
  channel: AutomationChannel;
  nodes: readonly CanvasNode[];
  edges: readonly Edge[];
  /** The server's verdict on the drawn graph, so the canvas can mark the steps. */
  onIssues: (issues: FlowIssue[]) => void;
}

/**
 * One test conversation. Starting sends the canvas AS DRAWN, so the operator
 * tests what they see; the server answers with the whole run so far — a test
 * skips delays, so the only pause it can stop at is a wait for a reply.
 */
export function useTestRun({ flowId, channel, nodes, edges, onIssues }: Params) {
  const { t } = useTranslation();
  const [run, setRun] = useState<AutomationRun | null>(null);
  const [start, { loading: starting }] = useMutation<{ startAutomationTest: AutomationRun }>(START_TEST);
  const [resume, { loading: replying }] = useMutation<{ resumeAutomationTest: AutomationRun }>(RESUME_TEST);

  const fail = useCallback(
    (error: unknown, fallbackKey: string) => {
      const issues = (error as { graphQLErrors?: Array<{ extensions?: { issues?: FlowIssue[] } }> })?.graphQLErrors?.[0]?.extensions?.issues;
      if (Array.isArray(issues)) onIssues(issues);
      notifyError(parseApiError(error, t(fallbackKey)));
    },
    [onIssues, t]
  );

  const begin = useCallback(
    async (values: AutomationContactFormValues) => {
      rememberContact(values);
      try {
        const result = await start({
          variables: {
            input: {
              flow_id: flowId,
              nodes: toNodeInputs(nodes),
              edges: toEdgeInputs(edges),
              contact: {
                name: values.name,
                phone: channel === 'WHATSAPP' ? values.phone : null,
                email: channel === 'EMAIL' ? values.email : null,
              },
              text: values.text,
              subject: values.subject,
              deliver: values.deliver,
            },
          },
        });
        if (result.data) {
          setRun(result.data.startAutomationTest);
          onIssues([]);
        }
      } catch (error) {
        fail(error, 'ai.automation.test.startFailed');
      }
    },
    [start, flowId, nodes, edges, channel, onIssues, fail]
  );

  const reply = useCallback(
    async (text: string, timedOut = false) => {
      if (!run) return;
      try {
        const result = await resume({ variables: { input: { run_id: run.id, text, timed_out: timedOut } } });
        if (result.data) setRun(result.data.resumeAutomationTest);
      } catch (error) {
        fail(error, 'ai.automation.test.replyFailed');
      }
    },
    [run, resume, fail]
  );

  const reset = useCallback(() => setRun(null), []);

  return { run, starting, replying, begin, reply, reset };
}
