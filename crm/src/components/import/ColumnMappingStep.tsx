import { Box, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ImportField } from '../../config/importFields';

interface Props {
  fields: ImportField[];
  headers: string[];
  mapping: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const IGNORE = '';

/** One row per canonical field → a Select of detected spreadsheet headers. */
export default function ColumnMappingStep({ fields, headers, mapping, onChange }: Readonly<Props>) {
  const set = (field: string, header: string) => onChange({ ...mapping, [field]: header });
  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        Match each lead field to a column from your file. Required fields are marked. Leave as
        "— Ignore —" to skip a field.
      </Typography>
      <Box sx={{ maxHeight: 360, overflowY: 'auto', pr: 0.5 }}>
        <Stack spacing={1}>
          {fields.map((f) => (
            <Stack key={f.field} direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 200, flexShrink: 0 }}>
                <Typography variant="body2" noWrap>
                  {f.label}
                  {f.required && <Chip size="small" color="error" label="required" sx={{ ml: 0.5, height: 18 }} />}
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                fullWidth
                value={mapping[f.field] ?? IGNORE}
                onChange={(e) => set(f.field, e.target.value)}
                error={f.required && !mapping[f.field]}
              >
                <MenuItem value={IGNORE}><em>— Ignore —</em></MenuItem>
                {headers.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
              </TextField>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
