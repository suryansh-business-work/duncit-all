import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import { DuncitButton } from '@duncit/buttons';
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
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between"
      }}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <SpellcheckIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Translations
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
        <DuncitButton variant="contained" startIcon={<AddIcon />} disabled={!canAdd} onClick={onAdd}>
          Add translation
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
