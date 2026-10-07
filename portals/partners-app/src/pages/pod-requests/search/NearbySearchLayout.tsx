import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { BackHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import QuotaLine from './QuotaLine';
import RequestPodDialog from './request-note';
import SearchFilters from './SearchFilters';
import type { PodRequestQuota } from '../queries';
import type { useRequestPod } from './useRequestPod';

interface Props {
  title: string;
  backTo: string;
  /** The venue picker on the host search; nothing on the venue search. */
  picker?: ReactNode;
  /** Set when the search cannot run yet (no venue, no city) — replaces filters and results. */
  blocked?: string | null;
  quota: PodRequestQuota | null;
  radiusKm: number;
  onRadius: (km: number) => void;
  categoryIds: readonly string[];
  onCategories: (ids: string[]) => void;
  request: ReturnType<typeof useRequestPod>;
  children: ReactNode;
}

/** The frame both nearby searches share: header, filters, results, Request Pod dialog. */
export default function NearbySearchLayout(props: Readonly<Props>) {
  const { t } = useTranslation();
  const { request } = props;
  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="pod-request-search">
      <BackHeader backTo={props.backTo} backAriaLabel={t('podRequests.backToList')} title={props.title} />
      <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2}>
          {props.picker}
          {props.blocked ? (
            <Alert severity="info">{props.blocked}</Alert>
          ) : (
            <>
              <QuotaLine quota={props.quota} />
              <SearchFilters
                radiusKm={props.radiusKm}
                onRadius={props.onRadius}
                categoryIds={props.categoryIds}
                onCategories={props.onCategories}
              />
            </>
          )}
        </Stack>
      </Card>
      {request.sentText && (
        <Alert severity="success" onClose={request.clearSent}>
          {request.sentText}
        </Alert>
      )}
      {!props.blocked && props.children}
      <RequestPodDialog
        open={Boolean(request.target)}
        targetName={request.target?.name ?? ''}
        sending={request.sending}
        error={request.error}
        onSend={request.submit}
        onCancel={request.close}
      />
    </Stack>
  );
}
