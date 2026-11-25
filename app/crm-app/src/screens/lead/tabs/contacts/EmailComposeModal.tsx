import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { crmTextToHtml } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

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
import { SheetModal } from '../parts/SheetModal';
import { sendLeadEmail } from './sendLeadEmail';

/** No lead values to fill templates with (the Contacts tab, creator, community and ecomm leads). */
const NO_VALUES: Readonly<Record<string, string>> = {};

export interface ComposeTarget {
  /** Who it is addressed to: the contact's name, else the lead's. */
  displayName: string;
  email?: string | null;
}

interface Props {
  kind: LeadKind;
  id: string;
  /** Open while set. */
  target: ComposeTarget | null;
  leadValues?: Readonly<Record<string, string>>;
  onClose: () => void;
  /** The server's answer, to show once the sheet has closed. */
  onResult: (message: string, ok: boolean) => void;
}

function ComposeSheet({
  kind,
  id,
  target,
  leadValues = NO_VALUES,
  onClose,
  onResult,
}: Readonly<Props & { target: ComposeTarget }>) {
  const { t } = useTranslation();
  const defaultSubject = t('crm.compose.regarding', { vars: { name: target.displayName } });
  const resolver = useMemo(() => formResolver<LeadEmailValues>(makeLeadEmailSchema(t)), [t]);
  const { control, handleSubmit, formState } = useForm({
    defaultValues: leadEmailDefaults(target.email ?? '', defaultSubject),
    resolver,
    mode: 'onTouched',
  });
  const [body, setBody] = useState<TemplateBody>(emptyTemplateBody);
  const [error, setError] = useState<string | null>(null);

  const send = async (values: LeadEmailValues) => {
    setError(null);
    if (values.mode === 'template' && !body.ready) {
      setError(t('crmApp.compose.templateNotReady'));
      return;
    }
    const content =
      values.mode === 'template'
        ? {
            subject: body.subject || defaultSubject,
            body: body.html,
            attachments: body.attachments,
          }
        : { subject: values.subject, body: crmTextToHtml(values.message), attachments: [] };
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
      title={t('crm.compose.emailTitle', { vars: { name: target.displayName } })}
      busy={busy}
      onClose={onClose}
      testID="compose-email"
      footer={
        <>
          <DuncitButton
            label={t('shell.common.cancel')}
            onPress={onClose}
            variant="ghost"
            disabled={busy}
            testID="compose-cancel"
          />
          <DuncitButton
            label={busy ? t('crm.compose.sending') : t('crm.compose.sendEmail')}
            onPress={() =>
              fireAndForget(
                handleSubmit(send)(),
                logs.mobileApp,
                'crm-app/EmailComposeModal',
                'send',
              )
            }
            loading={busy}
            testID="compose-send"
          />
        </>
      }
    >
      {error ? <AuthAlert message={error} testID="compose-error" /> : null}
      <LeadEmailFields
        control={control}
        entity={kind}
        leadName={target.displayName}
        leadValues={leadValues}
        onBody={setBody}
      />
    </SheetModal>
  );
}

/**
 * The portal's email compose window on a phone: a sheet with the provider,
 * the address, a template or a plain-text message, and Send. A fresh sheet
 * every time it opens, so nothing from the last email lingers.
 */
export function EmailComposeModal(props: Readonly<Props>) {
  if (!props.target) return null;
  return <ComposeSheet {...props} target={props.target} />;
}
