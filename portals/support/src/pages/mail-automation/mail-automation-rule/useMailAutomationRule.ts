import { useEffect, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  MAIL_AUTOMATION_ACCOUNTS,
  MAIL_AUTOMATION_PREVIEW,
  UPDATE_MAIL_AUTOMATION_RULE,
  type MailAutomationAccount,
} from '../../../graphql/mail-automation';
import {
  STEP_FIELDS,
  TICKET_TOKEN,
  accountToValues,
  buildRuleSchema,
  type MailAutomationRuleValues,
} from './mail-automation-rule.types';

export interface ReplyPreview {
  text: string;
  by_ai: boolean;
}

export const STEP_KEYS = [
  'support.mailAutomation.stepMailbox',
  'support.mailAutomation.stepMessage',
  'support.mailAutomation.stepTicket',
];

/** The window as the reply words it. Mirrors the server's `slaLabel` so the
 * hint on step 3 reads exactly like the sentence that will be sent. */
export function slaLabel(min: number, max: number): string {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const unit = high === 1 ? 'hour' : 'hours';
  return low === high ? `${high} ${unit}` : `${low}-${high} ${unit}`;
}

/**
 * Everything the three-step rule wizard does, minus the markup.
 *
 * Split out so the form component stays a readable render (project rule 9 caps
 * a .tsx at 200 lines) and so the step logic — which validation gates which
 * step, what the preview sends — can be read in one place.
 */
export function useMailAutomationRule(account: MailAutomationAccount, onSaved: () => void) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<ReplyPreview | null>(null);
  const selectedId = account.id;

  const schema = useMemo(
    () =>
      buildRuleSchema({
        required: t('support.mailAutomation.messageRequired'),
        needsTicket: t('support.mailAutomation.messageNeedsTicket', {
          vars: { ticketToken: TICKET_TOKEN },
        }),
        range: t('support.mailAutomation.slaRange'),
        order: t('support.mailAutomation.slaOrder'),
      }),
    [t]
  );

  const form = useForm<MailAutomationRuleValues, any, MailAutomationRuleValues>({
    resolver: zodResolver(schema) as unknown as Resolver<MailAutomationRuleValues, any, MailAutomationRuleValues>,
    mode: 'onBlur',
    defaultValues: accountToValues(account),
  });
  const { getValues, reset, trigger } = form;

  // A different mailbox loads that mailbox's saved rule. Without this the form
  // keeps the previous one's message and would save it onto the new mailbox.
  useEffect(() => {
    reset(accountToValues(account));
    setPreview(null);
    setStep(0);
  }, [account.id, reset]);

  const [save, saving] = useMutation<any>(UPDATE_MAIL_AUTOMATION_RULE, {
    refetchQueries: [MAIL_AUTOMATION_ACCOUNTS],
  });
  const [runPreview, previewState] = useLazyQuery<{ mailAutomationPreview: ReplyPreview }>(
    MAIL_AUTOMATION_PREVIEW,
    { fetchPolicy: 'network-only' }
  );

  /**
   * The draft as the API expects it.
   *
   * getValues() returns RHF's raw values, and an MUI number field stores what
   * the DOM gave it — the STRING '36'. Zod's coercion only runs on the way into
   * handleSubmit, so without converting here the preview sends a String where
   * the schema declares Int! and the whole query is rejected before it runs.
   */
  const draftInput = () => {
    const values = getValues();
    return {
      id: selectedId,
      ...values,
      sla_min_hours: Number(values.sla_min_hours),
      sla_max_hours: Number(values.sla_max_hours),
    };
  };

  const onPreview = async () => {
    // Only the message step's own fields — an unfinished step 3 must not block
    // reading back the sentence being written on step 2.
    if (!(await trigger(['reply_template']))) return;
    // useLazyQuery's execute promise RESOLVES on failure, it does not reject,
    // so the error arrives in the result rather than as a throw. A try/catch
    // here would look like error handling and catch nothing.
    const result = await runPreview({ variables: { input: draftInput() } });
    if (result.error) {
      notify(
        t('support.mailAutomation.previewFailed', { vars: { reason: parseApiError(result.error) } }),
        'error'
      );
      return;
    }
    if (result.data?.mailAutomationPreview) setPreview(result.data.mailAutomationPreview);
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0 && !(await trigger(fields))) return;
    setStep((current) => Math.min(current + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  /**
   * Stepper labels navigate BACKWARDS only.
   *
   * Clicking ahead skipped goNext's validation gate, so an operator could leave
   * step 2 with the reply message empty, jump to step 3 and press Save — and
   * the zod resolver would reject silently, because handleSubmit simply never
   * calls onSubmit. No toast, no error, nothing saved: the page looked like it
   * had worked. Going back is always safe; going forward goes through Next.
   */
  const goToStep = (index: number) => {
    if (index < step) setStep(index);
  };

  const onSubmit = async (values: MailAutomationRuleValues) => {
    try {
      await save({ variables: { input: { id: selectedId, ...values } } });
      notify(t('support.mailAutomation.saved'), 'success');
      onSaved();
    } catch (err) {
      notify(
        t('support.mailAutomation.saveFailed', { vars: { reason: parseApiError(err) } }),
        'error'
      );
    }
  };

  return {
    t,
    form,
    step,
    preview,
    previewing: previewState.loading,
    savingRule: saving.loading,
    onPreview,
    goNext,
    goBack,
    goToStep,
    onSubmit,
  };
}
