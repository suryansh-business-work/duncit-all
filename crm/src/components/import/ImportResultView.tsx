import {
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: { row: number; message: string }[];
}

/** Full, scrollable result: summary + every failed row with a parsed reason. */
export default function ImportResultView({ result }: { result: ImportResult }) {
  return (
    <Box>
      <Alert severity={result.failed === 0 ? 'success' : 'warning'} sx={{ mb: result.errors.length ? 1.5 : 0 }}>
        <Typography variant="body2" fontWeight={700}>
          Imported {result.inserted} of {result.inserted + result.failed} rows
          {result.failed > 0 ? ` · ${result.failed} failed` : ''}
        </Typography>
      </Alert>
      {result.errors.length > 0 && (
        <Box sx={{ maxHeight: 320, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>Row</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.errors.map((e, i) => (
                <TableRow key={`${e.row}-${i}`}>
                  <TableCell>{e.row}</TableCell>
                  <TableCell><Typography variant="caption">{e.message}</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
