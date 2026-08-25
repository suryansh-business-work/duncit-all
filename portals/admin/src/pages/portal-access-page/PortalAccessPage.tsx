import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import { useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import {
  APPROVE_PORTAL_ACCESS,
  DENY_PORTAL_ACCESS,
  PORTAL_ACCESS_REQUESTS_TABLE,
} from './queries';
import {
  portalNameOf,
  STATUS_FILTERS,
  type PortalAccessRequest,
  type PortalAccessStatus,
} from './helpers';
import PortalAccessTable from './PortalAccessTable';

/** Admin > Portal Access — the Jump to Portal request inbox: who asked for
 * which console and when, with approve/deny. The decision's side effects
 * (role grant + email) run on the server. */
export default function PortalAccessPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const confirm = useConfirm();
  const [status, setStatus] = useState<'' | PortalAccessStatus>('PENDING');

  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [approveMut] = useMutation(APPROVE_PORTAL_ACCESS);
  const [denyMut] = useMutation(DENY_PORTAL_ACCESS);

  // The whole page is one request type; the status toggle narrows it further.
  const fetchRows = useApolloTableFetch<PortalAccessRequest>(
    client,
    PORTAL_ACCESS_REQUESTS_TABLE,
    'approvalRequestsTable',
    {
      extraFilters: [
        { field: 'type', op: 'eq', value: 'PORTAL_ACCESS' },
        ...(status ? [{ field: 'status', op: 'eq', value: status } satisfies TableFilterValue] : []),
      ],
    },
    [status]
  );

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;
    refetchRef.current?.();
  }, [status]);

  const handleApprove = async (row: PortalAccessRequest) => {
    const vars = { name: row.subject_name ?? '—', portal: portalNameOf(row.target_id) };
    const ok = await confirm({
      title: t('admin.portalAccess.approveTitle'),
      message: t('admin.portalAccess.approveMessage', { vars }),
      confirmLabel: t('admin.portalAccess.approve'),
    });
    if (!ok) return;
    try {
      await approveMut({ variables: { id: row.id } });
      notifySuccess(t('admin.portalAccess.approved'));
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('admin.portalAccess.failed'));
    }
  };

  const handleDeny = async (row: PortalAccessRequest) => {
    const vars = { name: row.subject_name ?? '—', portal: portalNameOf(row.target_id) };
    const ok = await confirm({
      title: t('admin.portalAccess.denyTitle'),
      message: t('admin.portalAccess.denyMessage', { vars }),
      destructive: true,
      confirmLabel: t('admin.portalAccess.deny'),
    });
    if (!ok) return;
    try {
      await denyMut({ variables: { id: row.id } });
      notifySuccess(t('admin.portalAccess.denied'));
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('admin.portalAccess.failed'));
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <LockPersonIcon color="primary" />
        <Box>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            {t('admin.portalAccess.title')}
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('admin.portalAccess.subtitle')}
          </Typography>
        </Box>
      </Stack>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={status}
        onChange={(_e, value) => {
          if (value !== null) setStatus(value as '' | PortalAccessStatus);
        }}
        aria-label={t('admin.portalAccess.filterStatus')}
      >
        {STATUS_FILTERS.map((f) => (
          <ToggleButton key={f.labelKey} value={f.value}>
            {t(f.labelKey)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <PortalAccessTable
        t={t}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </Stack>
  );
}
