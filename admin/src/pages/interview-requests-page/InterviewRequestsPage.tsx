import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useDateFormat } from '../../utils/dateFormat';
import { DELETE_INTERVIEW, INTERVIEWS, UPDATE_INTERVIEW } from './queries';
import { slotTime } from './helpers';
import InterviewsTable from './InterviewsTable';
import ManageInterviewDialog from './ManageInterviewDialog';
import InterviewsToolbar from './InterviewsToolbar';
import InterviewDeleteDialog from './InterviewDeleteDialog';
import { toUpdateInterviewInput, type InterviewFormValues } from './interview.form';

export default function InterviewRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const { formatDate, formatDateTime } = useDateFormat();
  const fmtSlot = (s: { start: string; end: string }) =>
    `${formatDate(s.start)} ${slotTime(s.start)}`;
  const fmtSlotLong = (s: { start: string; end: string }) =>
    `${formatDateTime(s.start)} – ${slotTime(s.end)}`;

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter) f.status = statusFilter;
    if (typeFilter) f.type = typeFilter;
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, typeFilter]);

  const { data, loading, refetch } = useQuery(INTERVIEWS, { variables: { filter } });
  const [updateMut, { loading: saving }] = useMutation(UPDATE_INTERVIEW);
  const [deleteMut] = useMutation(DELETE_INTERVIEW);

  const items = data?.interviews ?? [];

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      PENDING: 0,
      SCHEDULED: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    items.forEach((i: any) => {
      map[i.status] = (map[i.status] || 0) + 1;
    });
    return map;
  }, [items]);

  const openDetails = (it: any) => {
    setActive(it);
    setError(null);
  };

  const submit = async (values: InterviewFormValues) => {
    if (!active) return;
    setError(null);
    try {
      const input = toUpdateInterviewInput(values);
      await updateMut({ variables: { interview_doc_id: active.id, input } });
      setToast('Interview updated');
      setActive(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { interview_doc_id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <EventAvailableIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>
          Interview Requests
        </Typography>
      </Stack>

      <InterviewsToolbar
        counts={counts}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
      />

      <InterviewsTable
        loading={loading}
        items={items}
        fmtSlot={fmtSlot}
        onManage={openDetails}
        onDelete={setDelTarget}
      />

      <ManageInterviewDialog
        active={active}
        saving={saving}
        error={error}
        fmtSlotLong={fmtSlotLong}
        onClose={() => setActive(null)}
        onSubmit={submit}
      />

      <InterviewDeleteDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast || ''}
      />
    </Box>
  );
}
