import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { CrmEmailTemplateTarget } from '@/generated/graphql/graphql';
import { FormDialog } from '@/components/email-templates/FormDialog';
import { TextField } from '@/components/TextField';
import { CrmAppEmailTemplateGenerateMjmlDocument } from '@/graphql/emailTemplates';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { formResolver } from '@/utils/form-resolver';
import {
  emailAiRequestDefaults,
  makeEmailAiRequestSchema,
  type EmailAiRequestValues,
} from './email-template-ai.types';

interface Props {
  open: boolean;
  /** The MJML the AI starts from (the starter for a new template). */
  currentMjml: string;
  /** Who the template is for — the AI writes for that audience. */
  target: CrmEmailTemplateTarget;
  onApply: (mjml: string) => void;
  onClose: () => void;
}

/**
 * "Create / update MJML with AI": the CRM email writer (its own prompts, the
 * brand images and the audience) writes or reworks the template from a request.
 */
export function EmailAiDialog({ open, currentMjml, target, onApply, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const resolver = useMemo(
    () => formResolver<EmailAiRequestValues>(makeEmailAiRequestSchema(t)),
    [t],
  );
  const { control, handleSubmit, reset, formState } = useForm({
    defaultValues: emailAiRequestDefaults,
    resolver,
  });
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    reset(emailAiRequestDefaults);
    setError(null);
    onClose();
  };

  const generate = async ({ prompt }: EmailAiRequestValues) => {
    setError(null);
    try {
      const { generateCrmEmailMjml } = await gqlRequest(CrmAppEmailTemplateGenerateMjmlDocument, {
        input: { prompt, current_mjml: currentMjml, target },
      });
      if (!generateCrmEmailMjml) {
        setError(t('crm.emailTemplates.aiNoMjml'));
        return;
      }
      onApply(generateCrmEmailMjml);
      close();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <FormDialog
      open={open}
      title={t('crm.emailTemplates.createUpdateMjmlWithAi')}
      submitLabel={formState.isSubmitting ? t('crm.common.working') : t('crm.emailTemplates.apply')}
      cancelLabel={t('shell.common.cancel')}
      busy={formState.isSubmitting}
      error={error}
      onSubmit={handleSubmit(generate)}
      onCancel={close}
      testID="email-ai-dialog"
    >
      <TextField
        control={control}
        name="prompt"
        label={t('crm.emailTemplates.prompt')}
        placeholder={t('crm.emailTemplates.aDiwaliOfferEmailWithA')}
        multiline
        testID="email-ai-prompt"
      />
    </FormDialog>
  );
}
