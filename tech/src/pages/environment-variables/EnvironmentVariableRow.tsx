import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { EnvironmentVariableRow as EnvRow } from './environmentVariables';

interface Props {
  row: EnvRow;
  busy: boolean;
  onSave: (key: string, value: string) => void;
  onClear: (key: string) => void;
}

const sourceColor = {
  DATABASE: 'success',
  ENV: 'info',
  EMPTY: 'default',
} as const;

export default function EnvironmentVariableRow({ row, busy, onSave, onClear }: Props) {
  const [value, setValue] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    setValue(row.is_secret ? '' : row.value || '');
    setShowSecret(false);
  }, [row.key, row.value, row.is_secret]);

  const helper = row.is_secret
    ? row.value
      ? `Current: ${row.value}`
      : 'No value configured'
    : row.has_fallback && !row.has_override
      ? 'Using fallback environment value'
      : 'Database override value';

  return (
    <Box sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="subtitle2">{row.label}</Typography>
          <Typography variant="caption" color="text.secondary">{row.app} · {row.key}</Typography>
        </Box>
        <TextField
          size="small"
          type={row.is_secret && !showSecret ? 'password' : 'text'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={row.is_secret ? 'Enter new secret override' : undefined}
          helperText={helper}
          fullWidth
          InputProps={
            row.is_secret
              ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={showSecret ? 'Hide value' : 'Show value'}>
                        <IconButton size="small" onClick={() => setShowSecret((next) => !next)}>
                          {showSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }
              : undefined
          }
        />
        <Chip size="small" label={row.source} color={sourceColor[row.source]} sx={{ minWidth: 96 }} />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={busy || !value.trim()}
            onClick={() => onSave(row.key, value)}
          >
            Save
          </Button>
          <IconButton
            size="small"
            color="error"
            disabled={busy || !row.has_override}
            onClick={() => onClear(row.key)}
            aria-label="clear override"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}
