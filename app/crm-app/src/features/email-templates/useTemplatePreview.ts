import { useCallback, useEffect, useRef, useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { CrmAppEmailTemplateRenderDocument } from '@/graphql/emailTemplates';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';

/** Wait for typing to pause before rendering, as the portal's editor does. */
export const PREVIEW_DEBOUNCE_MS = 600;

export interface TemplatePreview {
  html: string;
  errors: string[];
  /** Every {{ placeholder }} the MJML uses. */
  detected: string[];
  /** Render now; resolves to the MJML issues found (the request's failure counts as one). */
  render: () => Promise<string[]>;
}

/**
 * The server's render of the MJML with each variable's default value — the
 * same render a test send and a lead's email take — redone whenever the MJML
 * or the values change. A newer render always wins over an older answer.
 */
export function useTemplatePreview(
  mjml: string,
  varsJson: string,
  options: { enabled: boolean; fallbackError: string },
): TemplatePreview {
  const [html, setHtml] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const request = useRef(0);
  const { fallbackError } = options;

  const render = useCallback(async (): Promise<string[]> => {
    const id = ++request.current;
    try {
      const { renderCrmEmailTemplate: result } = await gqlRequest(
        CrmAppEmailTemplateRenderDocument,
        {
          mjml,
          vars: varsJson,
        },
      );
      if (id === request.current) {
        setHtml(result.html);
        setErrors(result.errors);
        setDetected(result.detected_variables);
      }
      return result.errors;
    } catch (err) {
      const failed = [errorMessage(err, fallbackError)];
      if (id === request.current) setErrors(failed);
      return failed;
    }
  }, [mjml, varsJson, fallbackError]);

  useEffect(() => {
    if (!options.enabled) return undefined;
    const timer = setTimeout(
      () => fireAndForget(render(), logs.mobileApp, 'crm-app/useTemplatePreview', 'render'),
      PREVIEW_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [render, options.enabled]);

  return { html, errors, detected, render };
}
