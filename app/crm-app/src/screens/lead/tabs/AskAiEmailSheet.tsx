import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { fireAndForget, logs } from '@duncit/logs';
import { crmTextToHtml } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import type { LeadKind } from '@/features/leads/leadKinds';
import {
  emptyTemplateBody,
  LeadEmailFields,
  leadEmailDefaults,
  makeLeadEmailSchema,
  type LeadEmailValues,
  type TemplateBody,
} from '@/forms/lead-email';
import { useTranslation } from '@/hooks/useTranslation';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { errorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import type { AskAiAction } from './AskAiState';
import { sendLeadEmail } from './contacts/sendLeadEmail';
import { htmlToText } from './ManualLogsHtml';
import { SheetModal } from './parts/SheetModal';

const NO_VALUES: Readonly<Record<string, string>> = {};

interface Props {
  kind: LeadKind;
  id: string;
  leadName: string;
  /** The first email on the lead, when the draft names nobody. */
  leadEmail: string | null;
  draft: AskAiAction;
  onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}

/**
 * An Ask AI email draft in the lead's own composer: the address, subject and
 * message come filled in from the draft, the agent edits them (or picks a
 * template) and sends it exactly as if written by hand. An unedited message
 * goes out as the assistant's formatted draft.
 */
function EmailSheet({ kind, id, leadName, leadEmail, draft, onClose, onResult }: Readonly<Props>) {
  const { t } = useTranslation();
  const draftText = useMemo(() => htmlToText(draft.body_html), [draft.body_html]);
  const subject = draft.subject || t('crm.compose.regarding', { vars: { name: leadName } });
  const resolver = useMemo(() => formResolver<LeadEmailValues>(makeLeadEmailSchema(t)), [t]);
  const { control, handleSubmit, formState } = useForm({
    defaultValues: {
      ...leadEmailDefaults(draft.to || leadEmail || '', subject),
      message: draftText,
    },
    resolver,
    mode: 'onTouched',
  });
  const [body, setBody] = useState<TemplateBody>(emptyTemplateBody);
  const [error, setError] = useState<string | null>(null);

  const htmlOf = (message: string) =>
    message.trim() === draftText && draft.body_html ? draft.body_html : crmTextToHtml(message);
  const send = async (values: LeadEmailValues) => {
    setError(null);
    if (values.mode === 'template' && !body.ready) {
      setError(t('crmApp.compose.templateNotReady'));
      return;
    }
    const content =
      values.mode === 'template'
        ? { subject: body.subject || subject, body: body.html, attachments: body.attachments }
        : { subject: values.subject, body: htmlOf(values.message), attachments: [] };
    try {
      const result = await sendLeadEmail({
        kind,
        id,
        to: values.to,
        providerId: values.provider_id,
        ...content,
      });
      onResult(result.message ?? t('crm.compose.done'), result.ok);
      onClose();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  const busy = formState.isSubmitting;
  return (
    <SheetModal
      open
      title={t('crm.compose.emailTitle', { vars: { name: leadName } })}
      busy={busy}
      onClose={onClose}
      testID="ask-ai-email"
      footer={
        <>
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onClose}
            variant="ghost"
            disabled={busy}
            testID="ask-ai-email-cancel"
          />
          <DuncitButton
            label={busy ? t('crm.compose.sending') : t('crm.compose.sendEmail')}
            onPress={() =>
              fireAndForget(handleSubmit(send)(), logs.mobileApp, 'crm-app/AskAiEmailSheet', 'send')
            }
            loading={busy}
            testID="ask-ai-email-send"
          />
        </>
      }
    >
      {error ? <AuthAlert message={error} testID="ask-ai-email-error" /> : null}
      <LeadEmailFields
        control={control}
        entity={kind}
        leadName={leadName}
        leadValues={NO_VALUES}
        onBody={setBody}
      />
    </SheetModal>
  );
}

/** Opens while an email draft is being reviewed; a fresh composer every time. */
export function AskAiEmailSheet(
  props: Readonly<Omit<Props, 'draft'> & { draft: AskAiAction | null }>,
) {
  if (!props.draft) return null;
  return <EmailSheet {...props} draft={props.draft} />;
}
