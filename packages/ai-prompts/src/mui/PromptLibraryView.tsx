import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { ConfirmDialog } from '@duncit/dialogs';
import { clientTableFetch, type TableQueryState } from '@duncit/table';
import { parseApiError } from '@duncit/utils';
import { AI_PROMPTS, DELETE_AI_PROMPT, RESET_AI_PROMPT } from '../queries';
import { promptFeedUrl } from '../copy';
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../i18n/useCopy';
import { promptSearchText } from '../search';
import type { AiPrompt, PromptKind } from '../types';
import { PromptsTable } from './PromptsTable';
import { PromptDialog } from './PromptDialog';
import { FeedUrlBar } from './FeedUrlBar';


export interface PromptLibraryViewProps {
  /** Origin of the API that serves the public feed, e.g. https://server.duncit.com. */
  apiOrigin: string;
}

/**
 * The AI Library.
 *
 * Two kinds sit behind two tabs because they are two different objects, not two
 * filters of one. A CODE prompt is declared in the server catalogue and read
 * back by a call site on every request — editing its body changes what the
 * product sends to the model, with no deploy in between, which is the entire
 * reason this page exists. An AI prompt is written here, belongs to nobody in
 * code, and is served by the public GET feed for something outside the server
 * to fetch.
 *
 * The whole list arrives on one query and the table filters it in memory
 * (`clientTableFetch`): this is configuration, a few dozen rows, and a server
 * table query for it would be machinery with nothing to do.
 */
export function PromptLibraryView({ apiOrigin }: Readonly<PromptLibraryViewProps>) {
  const copy = usePromptCopy();
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  // Rebuilt when the catalogue changes — a tab strip frozen at module load
  // would keep the language the console first rendered in.
  const tabStrip = useMemo(
    () => [
      { value: 'CODE' as PromptKind, label: copy.kinds.CODE.label },
      { value: 'AI' as PromptKind, label: copy.kinds.AI.label },
    ],
    [copy],
  );
  const tabs = useTabParam({ items: tabStrip, fallback: 'CODE' as PromptKind });
  const kind = tabs.value;

  const [editing, setEditing] = useState<AiPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiPrompt | null>(null);
  const [toReset, setToReset] = useState<AiPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation<any>(DELETE_AI_PROMPT);
  const [resetPrompt, { loading: resetting }] = useMutation<any>(RESET_AI_PROMPT);

  const load = useCallback(async () => {
    const { data } = await client.query<{ aiPrompts: AiPrompt[] }>({
      query: AI_PROMPTS,
      variables: { filter: { kind } },
      fetchPolicy: 'network-only',
      // A failed query rejects, so a resolved one always carries data. Apollo
      // v4 types it as optional anyway, and an empty library is the honest
      // reading of the case the type insists on.
      errorPolicy: 'none',
    });
    return data?.aiPrompts ?? [];
  }, [client, kind]);

  // The table asks for a page; the query answers with the whole (small) list,
  // and search/sort/paging happen over what is already here.
  const fetchRows = useCallback(
    async (q: TableQueryState) => clientTableFetch(await load(), promptSearchText)(q),
    [load],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (prompt: AiPrompt) => {
    setEditing(prompt);
    setDialogOpen(true);
  };

  /** Delete and reset differ only in the mutation; the surrounding dance is one. */
  const runRowAction = async (
    prompt: AiPrompt | null,
    run: (id: string) => Promise<unknown>,
    clear: () => void,
  ) => {
    if (!prompt) return;
    setError(null);
    try {
      await run(prompt.id);
      refetchRef.current?.();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      clear();
    }
  };

  const listUrl = useMemo(() => promptFeedUrl(apiOrigin, { kind }), [apiOrigin, kind]);
  const blurb = copy.kinds[kind].blurb;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <AutoStoriesIcon color="primary" />
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>
            {copy.pageTitle}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {copy.pageSubtitle}
        </Typography>
      </Box>

      <DuncitTabs {...tabs} />

      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        {blurb}
      </Typography>

      <FeedUrlBar url={listUrl} label={copy.apiCopyAll} />

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <PromptsTable
        kind={kind}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          kind === 'AI' ? (
            <DuncitButton size="small" startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              {copy.addPrompt}
            </DuncitButton>
          ) : undefined
        }
        onEdit={openEdit}
        onDelete={setToDelete}
        onReset={setToReset}
      />

      <PromptDialog
        open={dialogOpen}
        prompt={editing}
        apiOrigin={apiOrigin}
        onClose={() => setDialogOpen(false)}
        onSaved={() => refetchRef.current?.()}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={copy.deleteTitle}
        message={t('ai.library.deleteMessage', { vars: { name: toDelete?.name ?? '' } })}
        confirmLabel={copy.deleteConfirm}
        destructive
        loading={deleting}
        busyLabel={copy.busy}
        onConfirm={() =>
          runRowAction(
            toDelete,
            (id) => deletePrompt({ variables: { id } }),
            () => setToDelete(null),
          )
        }
        onClose={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!toReset}
        title={copy.resetTitle}
        message={t('ai.library.resetMessage', { vars: { name: toReset?.name ?? '' } })}
        confirmLabel={copy.resetConfirm}
        loading={resetting}
        busyLabel={copy.busy}
        onConfirm={() =>
          runRowAction(
            toReset,
            (id) => resetPrompt({ variables: { id } }),
            () => setToReset(null),
          )
        }
        onClose={() => setToReset(null)}
      />
    </Stack>
  );
}
