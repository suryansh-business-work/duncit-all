import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import {
  DELETE,
  FRAGMENT_OPTIONS,
  RENDER,
  TEMPLATES,
  UPDATE,
  type FragmentOption,
  type Tpl,
} from './queries';
import { useConfirm } from '@duncit/dialogs';
import { useTabParam } from '@duncit/ui';

type Snack = { kind: 'success' | 'error'; msg: string };

type PaneTab = 'preview' | 'code';
const PANE_TABS: PaneTab[] = ['preview', 'code'];

export function useEmailTemplateEditor() {
  const confirm = useConfirm();
  const { data, loading, refetch } = useQuery<{ emailTemplates: Tpl[] }>(TEMPLATES, {
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: fragmentData,
    loading: fragmentsLoading,
    error: fragmentsError,
  } = useQuery<{ emailFragments: FragmentOption[] }>(FRAGMENT_OPTIONS);
  const [updateTpl] = useMutation(UPDATE);
  const [deleteTpl] = useMutation(DELETE);
  const client = useApolloClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Tpl | null>(null);
  const [tab, setTab] = useTabParam<PaneTab>({ values: PANE_TABS, fallback: 'preview' });
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [detected, setDetected] = useState<string[]>([]);
  const [varsJson, setVarsJson] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);

  const list = data?.emailTemplates ?? [];
  const fragmentOptions = fragmentData?.emailFragments ?? [];

  // `?slug=` opens a named template — how an email log row links back to the
  // template it came from. Only on the first selection: once someone has picked
  // a template themselves, a stale slug in the URL must not drag them back.
  const wantedSlug = useSearchParams()[0].get('slug');

  useEffect(() => {
    if (selected || !list.length) return;
    const wanted = wantedSlug ? list.find((t) => t.slug === wantedSlug) : undefined;
    setSelected((wanted ?? list[0]).template_id);
  }, [list, selected, wantedSlug]);

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
        variables: { mjml: draft.mjml, vars: varsJson, fragment: draft.fragment_key ?? null },
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
  }, [draft?.mjml, draft?.fragment_key, varsJson]);

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
            fragment_key: draft.fragment_key ?? null,
            footer_note: draft.footer_note ?? '',
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
    fragmentOptions,
    fragmentsLoading,
    fragmentsError: fragmentsError?.message ?? null,
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
