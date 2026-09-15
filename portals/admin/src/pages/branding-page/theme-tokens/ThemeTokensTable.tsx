import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ModeColors } from '@duncit/auth-tokens';
import { useTranslation } from '@duncit/shell';
import ThemeTokenRow from './ThemeTokenRow';
import { TOKEN_ROWS, type ThemeTokenValues, type TokenKey } from './tokenRows';

interface Props {
  title: string;
  /** The bundled palette for this mode — shown beside each input and used for blanks. */
  local: ModeColors;
  values: ThemeTokenValues;
  onChange: (key: TokenKey, value: string) => void;
}

/**
 * One colour mode's tokens as an editable table. A plain MUI table rather than
 * `@duncit/table`: every cell is a form input, and the AG Grid table repaints
 * its cells on each value change, which would drop focus on every keystroke.
 */
export default function ThemeTokensTable({ title, local, values, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={title}>
          <TableHead>
            <TableRow>
              <TableCell>{t('admin.branding.colToken')}</TableCell>
              <TableCell>{t('admin.branding.colUsage')}</TableCell>
              <TableCell>{t('admin.branding.colLocal')}</TableCell>
              <TableCell>{t('admin.branding.colServer')}</TableCell>
              <TableCell>{t('admin.branding.colContrast')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TOKEN_ROWS.map((row) => (
              <ThemeTokenRow key={row.key} row={row} local={local} values={values} onChange={onChange} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
