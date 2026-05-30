import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ENVIRONMENT_SCOPES, type EnvironmentScope } from './environmentVariables';

interface Props {
  onSelect: (scope: EnvironmentScope) => void;
}

export default function EnvironmentScopesTable({ onSelect }: Props) {
  const { data, loading, error } = useQuery(ENVIRONMENT_SCOPES, { fetchPolicy: 'cache-and-network' });
  const scopes = (data?.environmentScopes ?? []) as EnvironmentScope[];

  if (loading && !scopes.length) {
    return <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>;
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Portal</TableCell>
            <TableCell align="right">Variables</TableCell>
            <TableCell align="right">Overrides</TableCell>
            <TableCell align="right">Manage</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scopes.map((scope) => (
            <TableRow key={scope.key} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={700}>{scope.label}</Typography>
                <Typography variant="caption" color="text.secondary">{scope.key}</Typography>
              </TableCell>
              <TableCell align="right">{scope.total}</TableCell>
              <TableCell align="right">
                {scope.overrides > 0
                  ? <Chip size="small" color="success" label={scope.overrides} />
                  : <Typography variant="caption" color="text.secondary">—</Typography>}
              </TableCell>
              <TableCell align="right">
                <Button size="small" endIcon={<ChevronRightIcon />} onClick={() => onSelect(scope)}>
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
