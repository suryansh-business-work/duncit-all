import { Box, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SignatureMethod } from '../../graphql/documents';

interface Props {
  typed: string;
  commitTyped: (text: string) => void;
  typedName: string;
  value: string;
  method: SignatureMethod | null;
}

/** Typed signature input with a preview of the rendered image. */
export function TypePanel({ typed, commitTyped, typedName, value, method }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <TextField
        label={t('legal.signature.typeYours')}
        value={typed}
        onChange={(e) => commitTyped(e.target.value)}
        placeholder={typedName || 'Your name'}
        fullWidth
      />
      {value && method === 'TYPE' && (
        <Box
          sx={{
            bgcolor: 'common.white',
            borderRadius: 1,
            p: 0.5,
            alignSelf: 'flex-start',
          }}
        >
          <Box
            component="img"
            src={value}
            alt={t('legal.signature.typedPreview')}
            sx={{ height: 80, objectFit: 'contain', display: 'block' }}
          />
        </Box>
      )}
    </Stack>
  );
}
