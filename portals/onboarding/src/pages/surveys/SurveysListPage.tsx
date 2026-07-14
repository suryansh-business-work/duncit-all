import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { tableQueryToGql, type TableFilterValue, type TableQueryState } from '@duncit/table';
import { CATEGORIES, DELETE_SURVEY, SURVEYS_TABLE, type CategoryOption, type SurveyKind, type SurveyRow } from './queries';
import ScopePicker, { type Scope } from './ScopePicker';
import DefaultSurveysSection from './DefaultSurveysSection';
import SurveysTable from './SurveysTable';

const emptyScope: Scope = { super_category_id: '', category_id: '', sub_category_id: '' };

/** List + manage onboarding surveys across the Super → Category → Sub taxonomy. */
export default function SurveysListPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [kind, setKind] = useState<SurveyKind | ''>('');
  const [scope, setScope] = useState<Scope>(emptyScope);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteSurvey, { loading: deleting }] = useMutation(DELETE_SURVEY);

  // Kind-default (unscoped) surveys are managed via the Default Survey menu and
  // must never surface in this table. The server cannot filter on "scoped", so
  // when no Super category is picked we filter on super_category_id IN <all supers>.
  const { data: supersData } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES, {
    variables: { level: 'SUPER', parent_id: null },
  });
  const superIds = (supersData?.categories ?? []).map((c) => c.id);
  const superIdsKey = superIds.join(',');

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filters: TableFilterValue[] = [...q.filters];
      if (kind) filters.push({ field: 'kind', op: 'eq', value: kind });
      if (scope.super_category_id) filters.push({ field: 'super_category_id', op: 'eq', value: scope.super_category_id });
      else filters.push({ field: 'super_category_id', op: 'in', values: superIdsKey.split(',') });
      if (scope.category_id) filters.push({ field: 'category_id', op: 'eq', value: scope.category_id });
      if (scope.sub_category_id) filters.push({ field: 'sub_category_id', op: 'eq', value: scope.sub_category_id });
      const { data } = await client.query({
        query: SURVEYS_TABLE,
        variables: tableQueryToGql({ ...q, filters }),
        fetchPolicy: 'network-only',
      });
      return { rows: data.surveysTable.rows as SurveyRow[], total: data.surveysTable.total as number };
    },
    [client, kind, scope, superIdsKey],
  );

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteSurvey({ variables: { id: confirmId } });
      setConfirmId(null);
      refetchRef.current?.();
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
        <DefaultSurveysSection />
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

      {!supersData && (
        <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
      )}
      {supersData && superIds.length === 0 && (
        <Alert severity="info">No category-specific surveys yet. The Default Survey (button above) is used as the fallback. Create one with “New survey”.</Alert>
      )}
      {supersData && superIds.length > 0 && (
        <SurveysTable
          key={`${kind}|${scope.super_category_id}|${scope.category_id}|${scope.sub_category_id}`}
          fetchRows={fetchRows}
          refetchRef={refetchRef}
          onOpen={(r) => navigate(`/surveys/${r.id}/edit`)}
          onDelete={(r) => setConfirmId(r.id)}
        />
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
