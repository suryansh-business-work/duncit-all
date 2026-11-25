import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { fireAndForget, logs } from '@duncit/logs';
import { crmInterpolateTemplate, crmStripPlaceholders } from '@duncit/utils';

import {
  CrmAppComposeRenderDocument,
  type CrmAppComposeTemplatesDocument,
} from '@/graphql/leadTabs';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { emptyTemplateBody, type TemplateBody } from './lead-email.types';

export type ComposeTemplate = ResultOf<
  typeof CrmAppComposeTemplatesDocument
>['crmEmailTemplates'][number];

/** How long the composer waits after the last edit before rendering the template again. */
const RENDER_DELAY_MS = 500;

/**
 * Renders the picked template with the lead's values under the edited ones —
 * the portal's TemplateBodyPicker: subject filled, leftover placeholders
 * stripped so no raw slug is ever sent. Reports the body through `onBody`
 * and returns the renderer's warnings.
 */
export function useTemplateBody(
  template: ComposeTemplate | null,
  vars: Readonly<Record<string, string>>,
  leadValues: Readonly<Record<string, string>>,
  onBody: (body: TemplateBody) => void,
): string[] {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!template) {
      onBody(emptyTemplateBody);
      return undefined;
    }
    let alive = true;
    const merged = { ...leadValues, ...vars };
    const subject = crmInterpolateTemplate(template.subject, merged);
    const attachments = template.attachments.map(({ url, name }) => ({ url, name }));
    const render = async () => {
      try {
        const data = await gqlRequest(CrmAppComposeRenderDocument, {
          mjml: template.mjml,
          vars: JSON.stringify(merged),
        });
        if (!alive) return;
        const html = crmStripPlaceholders(data.renderCrmEmailTemplate.html);
        setErrors(data.renderCrmEmailTemplate.errors);
        onBody({ subject, html, ready: Boolean(html), attachments });
      } catch (err) {
        if (!alive) return;
        setErrors([errorMessage(err, t('crmApp.common.loadFailed'))]);
        onBody({ subject, html: '', ready: false, attachments });
      }
    };
    const timer = setTimeout(
      () => fireAndForget(render(), logs.mobileApp, 'crm-app/useTemplateBody', 'render'),
      RENDER_DELAY_MS,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [template, vars, leadValues, onBody, t]);

  return template ? errors : [];
}
