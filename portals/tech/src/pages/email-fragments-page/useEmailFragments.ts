import { useEffect, useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useConfirm } from '@duncit/dialogs';
import {
  CREATE_FRAGMENT,
  DELETE_FRAGMENT,
  FRAGMENTS,
  RENDER,
  RESET_FRAGMENT,
  UPDATE_FRAGMENT,
  previewDocument,
  type Fragment,
} from './queries';

type Snack = { kind: 'success' | 'error'; msg: string };

/**
 * The fragments editor's state. Mirrors `useEmailTemplateEditor` on purpose —
 * the two pages sit beside each other and should behave the same way — but
 * there is no create and no delete here: the nine are fixed by the code's
 * category list, so the only destructive action offered is a reset.
 */
export function useEmailFragments() {
  const confirm = useConfirm();
  const { data, loading, refetch } = useQuery<{ emailFragments: Fragment[] }>(FRAGMENTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateFragment] = useMutation(UPDATE_FRAGMENT);
  const [resetFragment] = useMutation(RESET_FRAGMENT);
  const [createFragment] = useMutation(CREATE_FRAGMENT);
  const [deleteFragment] = useMutation(DELETE_FRAGMENT);
  const client = useApolloClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Fragment | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);

  const list = useMemo(() => data?.emailFragments ?? [], [data]);

  useEffect(() => {
    if (!selected && list.length) setSelected(list[0].key);
  }, [list, selected]);

  useEffect(() => {
    const found = list.find((f) => f.key === selected);
    if (found) setDraft({ ...found });
  }, [selected, list]);

  const dirty = useMemo(() => {
    const saved = list.find((f) => f.key === selected);
    return !!draft && !!saved && JSON.stringify(saved) !== JSON.stringify(draft);
  }, [draft, list, selected]);

  useEffect(() => {
    if (!draft) return;
    const id = setTimeout(async () => {
      try {
        const res = await client.query({
          query: RENDER,
          variables: { mjml: previewDocument(draft.header_mjml, draft.footer_mjml) },
          fetchPolicy: 'network-only',
        });
        setPreviewHtml(res.data?.renderEmailTemplate?.html ?? '');
        setPreviewErrors(res.data?.renderEmailTemplate?.errors ?? []);
      } catch (e: any) {
        setPreviewErrors([e.message]);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [draft, client]);

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await updateFragment({
        variables: {
          key: draft.key,
          input: {
            name: draft.name,
            description: draft.description,
            header_mjml: draft.header_mjml,
            footer_mjml: draft.footer_mjml,
            is_active: draft.is_active,
          },
        },
      });
      await refetch();
      setSnack({ kind: 'success', msg: 'Fragment saved' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  /** The only way back from a broken footer — there is no delete to fall back on. */
  const reset = async () => {
    if (!draft) return;
    const ok = await confirm({
      title: 'Reset fragment',
      message: `Replace the ${draft.name} header and footer with the versions Duncit shipped? Your edits to them are lost.`,
      destructive: true,
      confirmLabel: 'Reset',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await resetFragment({ variables: { key: draft.key } });
      await refetch();
      setSnack({ kind: 'success', msg: 'Reset to the shipped version' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  /** Add a fragment of your own, then select it so it can be filled in. */
  const create = async (name: string) => {
    setBusy(true);
    try {
      const { data } = await createFragment({ variables: { input: { name } } });
      await refetch();
      const key = data?.createEmailFragment?.key;
      if (key) setSelected(key);
      setSnack({ kind: 'success', msg: 'Fragment added' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  /** Only a fragment you added. The nine that ship refuse, loudly. */
  const remove = async () => {
    if (!draft) return;
    const ok = await confirm({
      title: 'Delete fragment',
      message: `Delete "${draft.name}"? Templates using it go back to no header and footer. This cannot be undone.`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteFragment({ variables: { key: draft.key } });
      setSelected(null);
      await refetch();
      setSnack({ kind: 'success', msg: 'Fragment deleted' });
    } catch (e: any) {
      setSnack({ kind: 'error', msg: e.message });
    } finally {
      setBusy(false);
    }
  };

  return {
    list,
    create,
    remove,
    loading,
    hasData: !!data,
    selected,
    setSelected,
    draft,
    setDraft,
    previewHtml,
    previewErrors,
    dirty,
    busy,
    snack,
    setSnack,
    save,
    reset,
  };
}
