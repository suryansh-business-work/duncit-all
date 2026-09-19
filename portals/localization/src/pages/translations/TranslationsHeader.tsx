import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpellcheckIcon from '@mui/icons-material/Spellcheck';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import ImportKeysButton from './ImportKeysButton';

interface Props {
  /** Locale the bundled English text is stored against — the default one. */
  defaultLocale: string | null;
  canAdd: boolean;
  /** There is a language besides the default one to translate into. */
  canTranslate: boolean;
  onImported: (message: string) => void;
  onError: (message: string) => void;
  onAdd: () => void;
  onAiTranslate: () => void;
}

/**
 * The namespaces-level header. Seeding keys, syncing every language with
 * English and adding one key by hand all belong here rather than inside a
 * namespace, because each can touch namespaces across the whole catalogue.
 */
export default function TranslationsHeader({
  defaultLocale,
  canAdd,
  canTranslate,
  onImported,
  onError,
  onAdd,
  onAiTranslate,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <SpellcheckIcon color="primary" />
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('localization.translations.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('localization.translations.intro')}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <ImportKeysButton defaultLocale={defaultLocale} onDone={onImported} onError={onError} />
        <DuncitButton
          variant="outlined"
          startIcon={<AutoAwesomeIcon />}
          disabled={!canTranslate}
          onClick={onAiTranslate}
          data-testid="translations-ai-translate"
        >
          {t('localization.translations.aiTranslate')}
        </DuncitButton>
        <DuncitButton variant="contained" startIcon={<AddIcon />} disabled={!canAdd} onClick={onAdd}>
          {t('localization.translations.add')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
