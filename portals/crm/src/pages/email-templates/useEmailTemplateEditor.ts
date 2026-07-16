import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { DELETE, EMAIL_TEMPLATE, RENDER, UPDATE, type EmailAsset, type EmailTemplate } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';

export type Snack = { kind: 'success' | 'error'; msg: string };

/** State + actions for editing one CRM email template (loaded by template_id). */
export function useEmailTemplateEditor(templateId: string) {
  const { data, loading, refetch } = useQuery<{ emailTemplate: EmailTemplate | null }>(EMAIL_TEMPLATE, {
    variables: { id: templateId },
    fetchPolicy: 'cache-and-network',
  });
  const [updateTpl] = useMutation(UPDATE);
  const [deleteTpl, { loading: deleting }] = useMutation(DELETE);
  const client = useApolloClient();

  const template = data?.emailTemplate ?? null;
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);

  // Preview/test values come from each variable's `sample` — i.e. its default
  // value (persisted on Save, reused as the fallback in compose).
  const varsJson = useMemo(
    () => JSON.stringify(Object.fromEntries((draft?.variables ?? []).map((v) => [v.key, v.sample ?? '']))),
    [draft]
  );

  useEffect(() => {
    if (!template) return;
    setDraft(JSON.parse(JSON.stringify(template)));
  }, [template]);

  // Images persist immediately via their own mutations, so they're excluded
  // from the dirty check (otherwise an upload would falsely flag unsaved edits).
  const dirty = useMemo(() => {
    if (!draft || !template) return false;
    const strip = (t: EmailTemplate) => ({ ...t, images: [] });
    return JSON.stringify(strip(template)) !== JSON.stringify(strip(draft));
  }, [draft, template]);

  const renderPreview = async (): Promise<string[]> => {
    if (!draft) return [];
    try {
      const res = await client.query({ query: RENDER, variables: { mjml: draft.mjml, vars: varsJson }, fetchPolicy: 'network-only' });
      const errors = res.data?.renderEmailTemplate?.errors ?? [];
      setPreviewHtml(res.data?.renderEmailTemplate?.html ?? '');
      setPreviewErrors(errors);
      setDetected(res.data?.renderEmailTemplate?.detected_variables ?? []);
      return errors;
    } catch (e) {
      const errors = [parseApiError(e)];
      setPreviewErrors(errors);
      return errors;
    }
  };

  useEffect(() => {
    if (!draft) return;
    const id = setTimeout(renderPreview, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.mjml, varsJson]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await updateTpl({
        variables: {
          id: draft.template_id,
          input: {
            name: draft.name,
            description: draft.description,
            subject: draft.subject,
            mjml: draft.mjml,
            variables: draft.variables.map(({ key, description, sample }) => ({ key, description, sample })),
            images: draft.images.map(({ url, name }) => ({ url, name })),
            attachments: draft.attachments.map(({ url, name }) => ({ url, name })),
            is_active: draft.is_active,
          },
        },
      });
      await refetch();
      setSnack({ kind: 'success', msg: 'Template saved' });
    } catch (e) {
      setSnack({ kind: 'error', msg: parseApiError(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft) return;
    await deleteTpl({ variables: { id: draft.template_id } });
  };

  const importDetected = () => {
    if (!draft) return;
    const existing = new Map(draft.variables.map((v) => [v.key, v]));
    detected.forEach((k) => { if (!existing.has(k)) existing.set(k, { key: k }); });
    setDraft({ ...draft, variables: [...existing.values()] });
  };

  /** Add a single variable (from an "Available for …" or detected chip). */
  const addVariable = (slug: string, description?: string) => {
    if (!draft || draft.variables.some((v) => v.key === slug)) return;
    setDraft({ ...draft, variables: [...draft.variables, { key: slug, description: description ?? null }] });
  };

  /** Remove a declared variable (deselect from a chip). */
  const removeVariable = (slug: string) => {
    if (!draft) return;
    setDraft({ ...draft, variables: draft.variables.filter((v) => v.key !== slug) });
  };

  const setImages = (images: EmailAsset[]) => draft && setDraft({ ...draft, images });
  const setAttachments = (attachments: EmailAsset[]) => draft && setDraft({ ...draft, attachments });

  const validateMjml = async () => {
    const errors = await renderPreview();
    const plural = errors.length === 1 ? '' : 's';
    setSnack({
      kind: errors.length ? 'error' : 'success',
      msg: errors.length ? `${errors.length} MJML issue${plural}` : 'MJML looks good',
    });
  };

  return {
    loading,
    template,
    draft,
    setDraft,
    tab,
    setTab,
    previewHtml,
    previewErrors,
    detected,
    varsJson,
    busy,
    deleting,
    dirty,
    snack,
    setSnack,
    save,
    remove,
    importDetected,
    addVariable,
    removeVariable,
    setImages,
    setAttachments,
    validateMjml,
  };
}
