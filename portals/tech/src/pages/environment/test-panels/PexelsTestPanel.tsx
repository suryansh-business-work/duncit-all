import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { TEST_ENV_PEXELS, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

export default function PexelsTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('nature');
  const [photos, setPhotos] = useState<string[]>([]);
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_PEXELS);

  const search = async () => {
    setResult(null);
    setPhotos([]);
    try {
      const res = await run({ variables: { id: entry.id, query } });
      const data = res.data?.testEnvPexels as RichTestResult | undefined;
      setResult(data ?? null);
      if (data?.data) setPhotos(JSON.parse(data.data));
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Searches Pexels with this API key and previews the results.
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField label={t('tech.environment.searchQuery')} value={query} onChange={(e) => setQuery(e.target.value)} fullWidth size="small" autoComplete="off" slotProps={{
          htmlInput: { autoComplete: 'off', 'data-1p-ignore': true, 'data-lpignore': true }
        }} />
        <DuncitButton startIcon={<SearchIcon />} variant="contained" onClick={search} disabled={loading}>
          {loading ? '…' : 'Load'}
        </DuncitButton>
      </Stack>
      <ResultAlert result={result} />
      {photos.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {photos.map((src) => (
            <Box key={src} component="img" src={src} alt="" sx={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 1 }} />
          ))}
        </Box>
      )}
    </Stack>
  );
}
