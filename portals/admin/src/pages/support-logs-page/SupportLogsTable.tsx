import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { COLOR, TAG_RE, type Submission } from './queries';

interface Props {
  loading: boolean;
  hasData: boolean;
  rows: Submission[];
  onView: (s: Submission) => void;
}

export default function SupportLogsTable({ loading, hasData, rows, onView }: Readonly<Props>) {
  if (loading && !hasData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (rows.length === 0) {
    return <Alert severity="info">No support submissions yet.</Alert>;
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>From</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((s) => {
            const m = s.subject.match(TAG_RE);
            const tag = m ? m[1] : 'OTHER';
            const cleanSubject = s.subject.replace(TAG_RE, '');
            return (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Typography variant="caption">
                    {new Date(s.created_at).toLocaleString('en-IN')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={tag} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{cleanSubject}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" color={COLOR[s.status]} label={s.status} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => onView(s)} aria-label="View">
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
