import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import { AI_PROMPTS } from '../../queries';
import { promptFeedUrl } from '../../copy';
import { usePromptCopy } from '../../i18n/useCopy';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { libraryPromptUrl } from '../../share/links';
import type { AiPrompt, LibraryTab } from '../../types';
import { PromptsTable } from '../PromptsTable';
import type { PromptRowActions } from '../PromptsTable/rowMenu';
import { FeedUrlBar } from '../FeedUrlBar';
import { PromptDetailDialog, type DetailTab } from '../PromptDetail';
import { QuickViewDialog } from '../QuickView';
import { useCopyText } from '../shared/useCopyText';
import { usePromptEvent } from '../shared/usePromptEvent';
import { LibraryHeader } from './LibraryHeader';
import { LibraryDialogs } from './LibraryDialogs';
import { useLibraryActions } from './useLibraryActions';
import { useOpenPromptByKey } from './useOpenPromptByKey';

export interface PromptLibraryViewProps {
  /** Origin of the API that serves the public feed, e.g. https://server.duncit.com. */
  apiOrigin: string;
  /** Key of a prompt whose details are open: a link from elsewhere or a clicked row, `?prompt=<key>`. */
  openPromptKey?: string | null;
  /** Called when the details close, so the page can drop the key from its URL. */
  onPromptClose?: () => void;
  /** Called to open a prompt's details, so the page can put its key in the URL. Without it, the view opens them itself. */
  onPromptOpen?: (key: string, tab?: DetailTab) => void;
  /** The AI portal's own origin, for share links. Defaults to the page's. */
  portalOrigin?: string;
}

/**
 * The AI Library: code prompts (declared in the server catalogue and read back
 * on every call), AI prompts (written here, served by the public GET feed), and
 * the AI prompts that were archived. Clicking a row opens its detail view.
 *
 * The whole list of a tab arrives on one query and the table filters it in
 * memory (`clientTableFetch`): this is configuration, a few dozen rows.
 */
export function PromptLibraryView({ apiOrigin, openPromptKey, onPromptClose, onPromptOpen, portalOrigin }: Readonly<PromptLibraryViewProps>) {
  const copy = usePromptCopy();
  const more = useDetailCopy();
  const { t } = useTranslation();
  const client = useApolloClient();
  const copyText = useCopyText();
  const recordEvent = usePromptEvent();
  const refetchRef = useRef<(() => void) | null>(null);
  const origin = portalOrigin ?? globalThis.location.origin;
  const tabStrip = useMemo(
    () => [
      { value: 'CODE' as LibraryTab, label: copy.kinds.CODE.label },
      { value: 'AI' as LibraryTab, label: copy.kinds.AI.label },
      { value: 'ARCHIVED' as LibraryTab, label: more.tabs.archived },
    ],
    [copy, more],
  );
  const tabs = useTabParam({ items: tabStrip, fallback: 'CODE' as LibraryTab });
  const tab = tabs.value;
  const library = useLibraryActions(refetchRef);
  const [detailId, setDetailId] = useState<string | null>(null);
  // Bumped when the editor saves, so an open detail view reads the new text.
  const [detailRevision, setDetailRevision] = useState(0);
  const [glance, setGlance] = useState<AiPrompt | null>(null);

  const load = useCallback(async () => {
    const filter = tab === 'ARCHIVED' ? { archived: true } : { kind: tab };
    const { data } = await client.query<{ aiPrompts: AiPrompt[] }>({
      query: AI_PROMPTS,
      variables: { filter },
      fetchPolicy: 'network-only',
      errorPolicy: 'none',
    });
    // A failed query rejects, so a resolved one carries data (Apollo v4 still types it optional).
    return (data as { aiPrompts: AiPrompt[] }).aiPrompts;
  }, [client, tab]);

  const open = useCallback(
    (prompt: AiPrompt, detailTab?: DetailTab) => {
      setGlance(null);
      if (onPromptOpen && prompt.key) onPromptOpen(prompt.key, detailTab);
      else setDetailId(prompt.id);
    },
    [onPromptOpen],
  );
  // The setter, not the whole actions object: that is rebuilt every render, and
  // the link lookup re-runs whenever one of its callbacks changes.
  const { setError } = library;
  const linkMissing = useCallback((key: string) => setError(t('ai.library.promptNotFound', { vars: { key } })), [setError, t]);
  const showFound = useCallback((prompt: AiPrompt) => setDetailId(prompt.id), []);
  useOpenPromptByKey(openPromptKey, showFound, linkMissing, setError);
  const closeDetail = () => {
    setDetailId(null);
    onPromptClose?.();
  };

  const { openEdit, askArchive, unarchive, askReset, askDelete } = library;
  const actions = useMemo<PromptRowActions>(
    () => ({
      onOpen: (prompt) => open(prompt),
      onEdit: openEdit,
      onQuickView: setGlance,
      onShare: (prompt) => {
        if (!prompt.key) return;
        void copyText(libraryPromptUrl(origin, prompt.key, prompt.kind), more.actions.linkCopied).then((ok) => {
          if (ok) recordEvent(prompt.id, { type: 'COPY_LINK' });
        });
      },
      onPublicShare: (prompt) => open(prompt, 'share'),
      onArchive: askArchive,
      onUnarchive: unarchive,
      onReset: askReset,
      onDelete: askDelete,
    }),
    [open, openEdit, askArchive, unarchive, askReset, askDelete, copyText, origin, more, recordEvent],
  );

  const listUrl = useMemo(() => (tab === 'ARCHIVED' ? null : promptFeedUrl(apiOrigin, { kind: tab })), [apiOrigin, tab]);
  const blurb = tab === 'ARCHIVED' ? more.tabs.archivedBlurb : copy.kinds[tab].blurb;
  const saved = () => {
    library.refresh();
    setDetailRevision((n) => n + 1);
  };

  return (
    <Stack spacing={2.5}>
      <LibraryHeader title={copy.pageTitle} subtitle={copy.pageSubtitle} />
      <DuncitTabs {...tabs} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {blurb}
      </Typography>
      {listUrl && <FeedUrlBar url={listUrl} label={copy.apiCopyAll} />}
      {library.error && (
        <Alert severity="error" onClose={() => library.setError(null)}>
          {library.error}
        </Alert>
      )}
      <PromptsTable
        tab={tab}
        load={load}
        refetchRef={refetchRef}
        actions={actions}
        toolbarActions={
          tab === 'AI' ? (
            <DuncitButton size="small" startIcon={<AddIcon />} variant="contained" onClick={library.openCreate}>
              {copy.addPrompt}
            </DuncitButton>
          ) : undefined
        }
      />
      <PromptDetailDialog
        key={detailRevision}
        promptId={detailId}
        portalOrigin={origin}
        onClose={closeDetail}
        onEdit={openEdit}
        onChanged={library.refresh}
      />
      <QuickViewDialog prompt={glance} onClose={() => setGlance(null)} onOpenDetails={(prompt) => open(prompt)} />
      <LibraryDialogs actions={library} apiOrigin={apiOrigin} onSaved={saved} />
    </Stack>
  );
}
