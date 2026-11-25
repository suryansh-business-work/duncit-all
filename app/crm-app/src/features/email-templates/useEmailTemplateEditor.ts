import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import {
  crmEmailVarsJson,
  crmInsertMjmlImage,
  crmMergeDetectedVariables,
  formatMjml,
} from '@duncit/utils';

import {
  CrmAppEmailTemplateDeleteDocument,
  CrmAppEmailTemplateDetailDocument,
  CrmAppEmailTemplateUpdateDocument,
} from '@/graphql/emailTemplates';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { EMPTY_DRAFT, toDraft, toUpdateInput, type EmailAsset, type TemplateDraft } from './draft';
import { useTemplatePreview } from './useTemplatePreview';

export interface EditorStatus {
  tone: 'success' | 'error';
  message: string;
}

/**
 * Editing one CRM email template, as the portal's editor does: the draft
 * (name, subject, MJML, variables, attachments, Active), its live render, Save,
 * Delete and the MJML tools. The image library is kept apart — it saves itself.
 */
export function useEmailTemplateEditor(id: string) {
  const { t } = useTranslation();
  const saved = useGqlQuery(
    CrmAppEmailTemplateDetailDocument,
    { id },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const template = saved.data?.crmEmailTemplate ?? null;
  const form = useForm<TemplateDraft>({ defaultValues: EMPTY_DRAFT });
  const variables = useFieldArray({ control: form.control, name: 'variables' });
  const attachments = useFieldArray({ control: form.control, name: 'attachments' });
  const [images, setImages] = useState<EmailAsset[]>([]);
  const [status, setStatus] = useState<EditorStatus | null>(null);
  const mjml = useWatch({ control: form.control, name: 'mjml' });
  const watchedVars = useWatch({ control: form.control, name: 'variables' });
  const varsJson = crmEmailVarsJson(watchedVars);
  const preview = useTemplatePreview(mjml, varsJson, {
    enabled: template !== null,
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const { reset } = form;

  useEffect(() => {
    if (!template) return;
    reset(toDraft(template));
    setImages(template.images);
  }, [template, reset]);

  const setMjml = (next: string) => form.setValue('mjml', next, { shouldDirty: true });
  const declared = new Set(watchedVars.map((v) => v.key));

  const save = form.handleSubmit(async (draft) => {
    setStatus(null);
    try {
      await gqlRequest(CrmAppEmailTemplateUpdateDocument, {
        id,
        input: toUpdateInput(draft, images),
      });
      await saved.refetch();
      setStatus({ tone: 'success', message: t('crm.emailTemplates.templateSaved') });
    } catch (err) {
      setStatus({ tone: 'error', message: errorMessage(err, t('crmApp.common.saveFailed')) });
    }
  });

  const validate = async () => {
    const issues = await preview.render();
    setStatus(
      issues.length
        ? { tone: 'error', message: t('crm.emailTemplates.mjmlIssues', { count: issues.length }) }
        : { tone: 'success', message: t('crm.emailTemplates.mjmlLooksGood') },
    );
  };

  return {
    template,
    loading: saved.loading,
    error: saved.error,
    refetch: saved.refetch,
    form,
    variables,
    attachments,
    images,
    setImages,
    status,
    setStatus,
    preview,
    varsJson,
    declared,
    save,
    validate,
    remove: () => gqlRequest(CrmAppEmailTemplateDeleteDocument, { id }),
    format: () => setMjml(formatMjml(form.getValues('mjml'))),
    insertImage: (url: string) => setMjml(crmInsertMjmlImage(form.getValues('mjml'), url)),
    applyAi: setMjml,
    /** Declare a variable from a chip, or take it off the template. */
    toggleVariable: (slug: string) => {
      const index = form.getValues('variables').findIndex((v) => v.key === slug);
      if (index === -1) variables.append({ key: slug, description: null, sample: null });
      else variables.remove(index);
    },
    /** Declare every detected placeholder the template does not declare yet. */
    syncDetected: () => {
      const current = form.getValues('variables');
      const added = crmMergeDetectedVariables(current, preview.detected).slice(current.length);
      if (added.length) variables.append(added);
    },
  };
}

export type TemplateEditor = ReturnType<typeof useEmailTemplateEditor>;
