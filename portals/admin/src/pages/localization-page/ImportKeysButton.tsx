import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button, Tooltip } from '@mui/material';
import DownloadingIcon from '@mui/icons-material/Downloading';
import { allFallbackEntries } from '@duncit/app-settings';
import { IMPORT_TRANSLATION_KEYS, SERVER_TRANSLATION_SEED } from './queries';

interface Props {
  /** Locale the bundled English text is stored against — the default one. */
  defaultLocale: string | null;
  onDone: (message: string) => void;
  onError: (message: string) => void;
}

/**
 * Seeds Translations with every key the apps actually ship copy for, so a new
 * page's strings appear here automatically instead of being typed by hand
 * (CLAUDE.md rule 38). Existing rows keep their translations — only missing
 * keys are created — so this is safe to press at any time.
 */
export default function ImportKeysButton({ defaultLocale, onDone, onError }: Readonly<Props>) {
  const client = useApolloClient();
  const [importKeys] = useMutation(IMPORT_TRANSLATION_KEYS);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!defaultLocale) return;
    setBusy(true);
    try {
      // The client surfaces' bundles come from the shared package; the MJML
      // email copy lives on the server, which reports its own keys.
      const { data } = await client.query<{
        serverTranslationSeed: { key: string; value: string }[];
      }>({ query: SERVER_TRANSLATION_SEED, fetchPolicy: 'network-only' });

      const merged: Record<string, string> = { ...allFallbackEntries() };
      for (const row of data?.serverTranslationSeed ?? []) merged[row.key] = row.value;

      const entries = Object.entries(merged).map(([key, value]) => ({ key, value }));
      const res = await importKeys({ variables: { locale: defaultLocale, entries } });
      const added = res.data?.importTranslationKeys ?? 0;
      onDone(added > 0 ? `${added} new key(s) imported` : 'Already up to date');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to import keys');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip title="Add every key the apps and emails ship, keeping existing translations">
      <span>
        <Button
          variant="outlined"
          startIcon={<DownloadingIcon />}
          disabled={busy || !defaultLocale}
          onClick={run}
        >
          {busy ? 'Importing…' : 'Import app keys'}
        </Button>
      </span>
    </Tooltip>
  );
}
