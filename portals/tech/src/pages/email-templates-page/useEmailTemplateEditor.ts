import { useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router-dom';
import {
  DELETE,
  FRAGMENT_OPTIONS,
  RENDER,
  TEMPLATE_USAGE,
  TEMPLATES,
  UPDATE,
  type FragmentOption,
  type TemplateUsage,
  type Tpl,
} from './queries';
import { useConfirm } from '@duncit/dialogs';
import { useTabParam } from '@duncit/tabs';
import { paneTabs as buildPaneTabs, type PaneTab } from './PreviewVariablesPane';
import { useTranslation } from '@duncit/app-settings';
import { AUTOSAVE_DELAY_MS, editableSnapshot, sampleVarsJson } from './template-draft';

type Snack = { kind: 'success' | 'error'; msg: string };

export function useEmailTemplateEditor() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { data, loading, refetch } = useQuery<{ emailTemplates: Tpl[] }>(TEMPLATES, {
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: fragmentData,
    loading: fragmentsLoading,
    error: fragmentsError,
  } = useQuery<{ emailFragments: FragmentOption[] }>(FRAGMENT_OPTIONS);
  // Its own query, so a page of MJML bodies is not refetched to move a tally,
  // and a slow roll-up over the whole log never holds the editor back.
  const { data: usageData, refetch: refetchUsage } = useQuery<{
    emailTemplateUsage: TemplateUsage[];
  }>(TEMPLATE_USAGE, { fetchPolicy: 'cache-and-network' });
  const [updateTpl] = useMutation<any>(UPDATE);
  const [deleteTpl] = useMutation<any>(DELETE);
  const client = useApolloClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Tpl | null>(null);
  const paneTabs = useTabParam<PaneTab>({ items: buildPaneTabs(t), fallback: 'preview' });
  const tab = paneTabs.value;
  const setTab = paneTabs.onChange;
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detected, setDetected] = useState<string[]>([]);
  const [varsJson, setVarsJson] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [autoSave, setAutoSave] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const list = data?.emailTemplates ?? [];
  const fragmentOptions = fragmentData?.emailFragments ?? [];
  // Keyed by slug because that is what the log rows carry — a template renamed
  // in the editor keeps its slug, and so keeps its history.
  const usageBySlug = useMemo(
    () => new Map((usageData?.emailTemplateUsage ?? []).map((u) => [u.slug, u])),
    [usageData]
  );

  // `?slug=` opens a named template — how an email log row links back to the
  // template it came from. Only on the first selection: once someone has picked
  // a template themselves, a stale slug in the URL must not drag them back.
  const wantedSlug = useSearchParams()[0].get('slug');

  useEffect(() => {
    if (selected || !list.length) return;
    const wanted = wantedSlug ? list.find((t) => t.slug === wantedSlug) : undefined;
    setSelected((wanted ?? list[0]).template_id);
  }, [list, selected, wantedSlug]);

  /**
   * Which template the draft was loaded from, so a background answer cannot
   * overwrite what is being typed. `cache-and-network` re-answers this query
   * after every save and on every window focus; reloading the draft each time
   * discarded any keystroke that landed while the request was in flight —
   * rare by hand, constant once auto-save is doing the saving.
   */
  const loadedId = useRef<string | null>(null);
  /** The last edit auto-save has attempted. Never attempted twice. */
  const autoSaved = useRef<string | null>(null);

  useEffect(() => {
    const found = list.find((x) => x.template_id === selected);
    if (!found || loadedId.current === found.template_id) return;
    loadedId.current = found.template_id;
    autoSaved.current = null;
    setSavedAt(null);
    setDraft(structuredClone(found));
    setVarsJson(sampleVarsJson(found));
  }, [selected, list]);

  const snapshot = useMemo(() => (draft ? JSON.stringify(editableSnapshot(draft)) : null), [draft]);

  const dirty = useMemo(() => {
    const saved = list.find((x) => x.template_id === selected);
    if (!snapshot || !saved) return false;
    return JSON.stringify(editableSnapshot(saved)) !== snapshot;
  }, [snapshot, list, selected]);

  const renderPreview = async () => {
    if (!draft) return [];
    setPreviewLoading(true);
    try {
      const res = await client.query<any>({
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
    } finally {
      setPreviewLoading(false);
    }
  };

  // MJML compiles on the SERVER, so the frame shows the previous render from
  // the keystroke that changed it until the round trip lands. The wait starts
  // here rather than inside the request so it covers the debounce too — that
  // silent half-second is most of what an operator experiences as lag.
  useEffect(() => {
    if (!draft) return;
    setPreviewLoading(true);
    const id = setTimeout(renderPreview, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.mjml, draft?.fragment_key, varsJson]);

  /** The one write. `silent` is auto-save, which must not narrate itself. */
  const persist = async (silent: boolean) => {
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
      setSavedAt(Date.now());
      if (!silent) setSnack({ kind: 'success', msg: 'Template saved' });
    } catch (e: any) {
      // A failed auto-save is the one thing it must speak up about: nobody
      // pressed anything, so silence would read as saved.
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  const save = () => persist(false);

  /**
   * Save on its own once the typing stops.
   *
   * Keyed on the edit itself rather than on `dirty`: were the server ever to
   * answer with something the editor cannot reproduce, a permanently dirty
   * draft would re-save every second forever. One attempt per distinct edit.
   */
  useEffect(() => {
    if (!autoSave || !dirty || busy || !snapshot || autoSaved.current === snapshot) return;
    const id = setTimeout(() => {
      autoSaved.current = snapshot;
      persist(true).catch(() => undefined);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, dirty, busy, snapshot]);

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
    loadedId.current = null;
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
    usageBySlug,
    refetchUsage,
    selected,
    setSelected,
    draft,
    setDraft,
    tab,
    setTab,
    previewHtml,
    previewErrors,
    previewLoading,
    detected,
    fragmentOptions,
    fragmentsLoading,
    fragmentsError: fragmentsError?.message ?? null,
    varsJson,
    setVarsJson,
    busy,
    dirty,
    autoSave,
    setAutoSave,
    savedAt,
    snack,
    setSnack,
    save,
    onDelete,
    importDetected,
    validateMjml,
  };
}
