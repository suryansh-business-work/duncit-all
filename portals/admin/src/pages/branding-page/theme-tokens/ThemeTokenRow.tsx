import { Box, Chip, Stack, TableCell, TableRow, Typography } from '@mui/material';
import type { ModeColors } from '@duncit/auth-tokens';
import { useTranslation } from '@duncit/shell';
import ColorField from '../../../components/ColorField';
import {
  isTokenValueValid,
  tokenContrast,
  type ThemeTokenValues,
  type TokenKey,
  type TokenRow,
} from './tokenRows';

const MONO = { fontFamily: 'monospace' } as const;

interface ContrastProps {
  row: TokenRow;
  local: ModeColors;
  values: ThemeTokenValues;
}

/** The token's worst WCAG contrast against what it sits on — or "decorative". */
function ContrastCell({ row, local, values }: Readonly<ContrastProps>) {
  const { t } = useTranslation();
  if (!row.against) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('admin.branding.contrastNone')}
      </Typography>
    );
  }
  const contrast = tokenContrast(values, local, row);
  if (!contrast) return null;
  const vars = { ratio: contrast.ratio.toFixed(2), pair: contrast.pair, min: contrast.min };
  return (
    <Chip
      size="small"
      variant="outlined"
      color={contrast.pass ? 'success' : 'error'}
      label={t(contrast.pass ? 'admin.branding.contrastPass' : 'admin.branding.contrastFail', { vars })}
    />
  );
}

interface Props {
  row: TokenRow;
  local: ModeColors;
  values: ThemeTokenValues;
  onChange: (key: TokenKey, value: string) => void;
}

/** One token: its name, what it colours, the bundled value, the admin's value, and its contrast. */
export default function ThemeTokenRow({ row, local, values, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const valid = isTokenValueValid(values[row.key]);
  return (
    <TableRow>
      <TableCell>
        <Typography variant="body2" sx={{ ...MONO, fontWeight: 700 }}>
          {row.key}
        </Typography>
      </TableCell>
      <TableCell sx={{ minWidth: 200 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t(row.hintKey)}
        </Typography>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            aria-hidden
            sx={{
              width: 20,
              height: 20,
              borderRadius: 1,
              bgcolor: local[row.key],
              border: 1,
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={MONO}>
            {local[row.key]}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 220 }}>
        <ColorField
          size="small"
          label={t('admin.branding.serverValueFor', { vars: { token: row.key } })}
          value={values[row.key]}
          placeholder={local[row.key]}
          onChange={(value) => onChange(row.key, value)}
          error={!valid}
          helperText={valid ? undefined : t('admin.branding.invalidColor')}
        />
      </TableCell>
      <TableCell>
        <ContrastCell row={row} local={local} values={values} />
      </TableCell>
    </TableRow>
  );
}
