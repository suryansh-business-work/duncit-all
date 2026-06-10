import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { DELETE, RENDER, TEMPLATES, Tpl, UPDATE } from './queries';
import { useConfirm } from '../../components/useConfirm';

type Snack = { kind: 'success' | 'error'; msg: string };

export function useEmailTemplateEditor() {
  const confirm = useConfirm();
  const { data, loading, refetch } = useQuery<{ emailTemplates: Tpl[] }>(TEMPLATES, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateTpl] = useMutation(UPDATE);
  const [deleteTpl] = useMutation(DELETE);
  const client = useApolloClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Tpl | null>(null);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const [varsJson, setVarsJson] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);

  const list = data?.emailTemplates ?? [];

  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].template_id);
  }, [list, selected]);

  useEffect(() => {
    const t = list.find((x) => x.template_id === selected);
    if (!t) return;
    setDraft(JSON.parse(JSON.stringify(t)));
    setVarsJson(
      JSON.stringify(
        Object.fromEntries(t.variables.map((v) => [v.key, v.sample ?? `{{${v.key}}}`])),
        null,
        2
      )
    );
  }, [selected, list]);

  const dirty = useMemo(() => {
    const t = list.find((x) => x.template_id === selected);
    return !!draft && !!t && JSON.stringify(t) !== JSON.stringify(draft);
  }, [draft, list, selected]);

  const renderPreview = async () => {
    if (!draft) return [];
    try {
      const res = await client.query({
        query: RENDER,
        variables: { mjml: draft.mjml, vars: varsJson },
        fetchPolicy: 'network-only',
      });
      const errors = res.data?.renderEmailTemplate?.errors ?? [];
      setPreviewHtml(res.data?.renderEmailTemplate?.html ?? '');
      setPreviewErrors(errors);
      setDetected(res.data?.renderEmailTemplate?.detected_variables ?? []);
      return errors;
    } catch (e: any) {
      const errors = [e.message];
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
            variables: draft.variables.map(({ key, description, sample }) => ({
              key,
              description,
              sample,
            })),
            is_active: draft.is_active,
          },
        },
      });
      await refetch();
      setSnack({ kind: 'success', msg: 'Template saved' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!draft) return;
    const ok = await confirm({
      title: 'Delete template',
      message: `Delete template "${draft.name}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteTpl({ variables: { id: draft.template_id } });
    setSelected(null);
    await refetch();
    setSnack({ kind: 'success', msg: 'Deleted' });
  };

  const importDetected = () => {
    if (!draft) return;
    const existing = new Map(draft.variables.map((v) => [v.key, v]));
    detected.forEach((k) => {
      if (!existing.has(k)) existing.set(k, { key: k });
    });
    setDraft({ ...draft, variables: [...existing.values()] });
  };

  const validateMjml = async () => {
    const errors = await renderPreview();
    setSnack({
      kind: errors.length ? 'error' : 'success',
      msg: errors.length ? `${errors.length} MJML issues` : 'MJML looks good',
    });
  };

  return {
    list,
    loading,
    hasData: !!data,
    refetch,
    selected,
    setSelected,
    draft,
    setDraft,
    tab,
    setTab,
    previewHtml,
    previewErrors,
    detected,
    varsJson,
    setVarsJson,
    busy,
    dirty,
    snack,
    setSnack,
    save,
    onDelete,
    importDetected,
    validateMjml,
  };
}
