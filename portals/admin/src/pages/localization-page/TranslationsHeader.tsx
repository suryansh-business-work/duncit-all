import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import ImportKeysButton from './ImportKeysButton';

interface Props {
  /** Locale the bundled English text is stored against — the default one. */
  defaultLocale: string | null;
  canAdd: boolean;
  onImported: (message: string) => void;
  onError: (message: string) => void;
  onAdd: () => void;
}

/**
 * The namespaces-level header. Seeding keys and adding one by hand both belong
 * here rather than inside a namespace, because either can create a namespace
 * that does not exist yet.
 */
export default function TranslationsHeader({
  defaultLocale,
  canAdd,
  onImported,
  onError,
  onAdd,
}: Readonly<Props>) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <SpellcheckIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Translations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Every user-facing string, grouped portal-wise and page-wise. Open a page to edit
            its entries; untranslated ones fall back to the default language, then to each
            app&apos;s bundled copy.
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5}>
        <ImportKeysButton
          defaultLocale={defaultLocale}
          onDone={onImported}
          onError={onError}
        />
        <Button variant="contained" startIcon={<AddIcon />} disabled={!canAdd} onClick={onAdd}>
          Add translation
        </Button>
      </Stack>
    </Stack>
  );
}
