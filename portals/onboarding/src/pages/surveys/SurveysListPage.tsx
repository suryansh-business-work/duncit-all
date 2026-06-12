import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { DELETE_SURVEY, SURVEYS, type SurveyKind } from './queries';
import ScopePicker, { type Scope } from './ScopePicker';

type Row = {
  id: string; kind: SurveyKind; title: string; is_active: boolean; updated_at?: string | null;
  super_category_name?: string | null; category_name?: string | null; sub_category_name?: string | null;
  questions: { qid: string }[];
};

const emptyScope: Scope = { super_category_id: '', category_id: '', sub_category_id: '' };
const scopeLabel = (r: Row) =>
  [r.super_category_name, r.category_name, r.sub_category_name].filter(Boolean).join(' › ') || 'Kind default';

/** List + manage onboarding surveys across the Super → Category → Sub taxonomy. */
export default function SurveysListPage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<SurveyKind | ''>('');
  const [scope, setScope] = useState<Scope>(emptyScope);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const variables = useMemo(
    () => ({
      kind: kind || null,
      super_category_id: scope.super_category_id || null,
      category_id: scope.category_id || null,
      sub_category_id: scope.sub_category_id || null,
    }),
    [kind, scope]
  );
  const { data, loading, error, refetch } = useQuery<{ surveys: Row[] }>(SURVEYS, { variables, fetchPolicy: 'cache-and-network' });
  const [deleteSurvey, { loading: deleting }] = useMutation(DELETE_SURVEY);
  const rows = data?.surveys ?? [];

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteSurvey({ variables: { id: confirmId } });
      setConfirmId(null);
      await refetch();
    } catch {
      setConfirmId(null);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <AssignmentIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>Surveys</Typography>
          <Typography variant="body2" color="text.secondary">Build category-specific onboarding surveys shown before users register a venue / become a host.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/surveys/new')}>New survey</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_, v) => setKind(v ?? '')}>
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="VENUE">Venue</ToggleButton>
          <ToggleButton value="HOST">Host</ToggleButton>
          <ToggleButton value="ECOMM">Ecomm</ToggleButton>
        </ToggleButtonGroup>
        <ScopePicker value={scope} onChange={setScope} emptyLabel="All" />
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
      )}
      {(!loading || data) && rows.length === 0 && (
        <Alert severity="info">No surveys yet. Create one with “New survey”.</Alert>
      )}
      {(!loading || data) && rows.length > 0 && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell align="center">Questions</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/surveys/${r.id}/edit`)}>
                  <TableCell>{r.title || <em>Untitled</em>}</TableCell>
                  <TableCell><Chip size="small" label={r.kind} variant="outlined" /></TableCell>
                  <TableCell>{scopeLabel(r)}</TableCell>
                  <TableCell align="center">{r.questions.length}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" color={r.is_active ? 'success' : 'default'} label={r.is_active ? 'Active' : 'Off'} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/surveys/${r.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setConfirmId(r.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
        <DialogTitle>Delete survey?</DialogTitle>
        <DialogContent><DialogContentText>This removes the survey definition. Existing responses are kept.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
