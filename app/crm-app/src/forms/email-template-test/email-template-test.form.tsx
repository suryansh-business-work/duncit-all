import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormDialog } from '@/components/email-templates/FormDialog';
import { TextField } from '@/components/TextField';
import { CrmAppEmailTemplateSendTestDocument } from '@/graphql/emailTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import {
  emailTestSendDefaults,
  makeEmailTestSendSchema,
  type EmailTestSendValues,
} from './email-template-test.types';

interface Props {
  open: boolean;
  templateId: string;
  /** Each variable's default value, as the JSON the render takes. */
  varsJson: string;
  /** The server's word on a send that went out. */
  onSent: (message: string) => void;
  onClose: () => void;
}

/** Send the saved template, rendered with the variables' default values, to one address. */
export function SendTestDialog({ open, templateId, varsJson, onSent, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<EmailTestSendValues>(makeEmailTestSendSchema(t)),
    [t],
  );
  const { control, handleSubmit, reset, formState } = useForm({
    defaultValues: emailTestSendDefaults,
    resolver,
  });
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    reset(emailTestSendDefaults);
    setError(null);
    onClose();
  };

  const send = async ({ to }: EmailTestSendValues) => {
    setError(null);
    try {
      const { sendCrmTestEmail: result } = await gqlRequest(CrmAppEmailTemplateSendTestDocument, {
        id: templateId,
        to,
        vars: varsJson,
      });
      if (!result.ok) {
        setError(result.message || t('crm.emailTemplates.failed'));
        return;
      }
      onSent(result.message || t('crm.emailTemplates.sent'));
      close();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <FormDialog
      open={open}
      title={t('crm.emailTemplates.sendTestEmail')}
      submitLabel={
        formState.isSubmitting ? t('crm.emailTemplates.sending') : t('crm.emailTemplates.send')
      }
      cancelLabel={t('shell.common.cancel')}
      busy={formState.isSubmitting}
      error={error}
      onSubmit={handleSubmit(send)}
      onCancel={close}
      testID="send-test-dialog"
    >
      <TextField
        control={control}
        name="to"
        label={t('crm.emailTemplates.to')}
        hint={t('crm.emailTemplates.sendTestHint')}
        keyboardType="email-address"
        autoComplete="email"
        testID="send-test-to"
      />
    </FormDialog>
  );
}
