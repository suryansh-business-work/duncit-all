import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Tooltip } from '@mui/material';
import DownloadingIcon from '@mui/icons-material/Downloading';
import { DuncitButton } from '@duncit/buttons';
import { allFallbackEntries } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { IMPORT_TRANSLATION_KEYS, SERVER_TRANSLATION_SEED } from '../../lib/queries';

interface SeedResult {
  serverTranslationSeed: { key: string; value: string }[];
}

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
  const { t } = useTranslation();
  const client = useApolloClient();
  const [importKeys] = useMutation<{ importTranslationKeys: number }>(IMPORT_TRANSLATION_KEYS);
  const [busy, setBusy] = useState(false);

  // Only the button calls this, and it stays disabled until there is a default locale.
  const run = async () => {
    setBusy(true);
    try {
      // The client surfaces' bundles come from the shared package; the MJML
      // email copy lives on the server, which reports its own keys.
      const { data } = await client.query<SeedResult>({
        query: SERVER_TRANSLATION_SEED,
        fetchPolicy: 'network-only',
      });

      const merged: Record<string, string> = { ...allFallbackEntries() };
      // Both fields are non-null in the schema, and a failed request throws
      // rather than resolving without data.
      for (const row of (data as SeedResult).serverTranslationSeed) merged[row.key] = row.value;

      const entries = Object.entries(merged).map(([key, value]) => ({ key, value }));
      const res = await importKeys({ variables: { locale: defaultLocale, entries } });
      const added = res.data?.importTranslationKeys ?? 0;
      onDone(
        added > 0
          ? t('localization.translations.imported', { count: added })
          : t('localization.translations.upToDate'),
      );
    } catch (e) {
      // A rejected query or mutation is always an Error — Apollo wraps anything else.
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip title={t('localization.translations.importHint')}>
      <span>
        <DuncitButton
          variant="outlined"
          startIcon={<DownloadingIcon />}
          disabled={busy || !defaultLocale}
          onClick={run}
        >
          {busy ? t('localization.translations.importing') : t('localization.translations.import')}
        </DuncitButton>
      </span>
    </Tooltip>
  );
}
