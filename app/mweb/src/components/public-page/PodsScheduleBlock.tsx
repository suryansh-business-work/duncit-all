import type { ReactNode } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import ClubPodsScheduleSection from '../../pages/club-details-page/ClubPodsScheduleSection';
import SectionHeader from '../SectionHeader';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';
import { useOpenPod } from './useOpenPod';

export interface SchedulePod {
  id: string;
  pod_id?: string | null;
  club_slug?: string | null;
  pod_date_time: string;
  pod_end_date_time?: string | null;
}

interface Props {
  title: string;
  testId: string;
  pods: SchedulePod[];
  loading: boolean;
  /** Shown instead of the rails when there are no pods; the club copy otherwise. */
  empty?: ReactNode;
}

/**
 * A public page's pods — Happening soon / Upcoming / Previous rails, the club
 * page's look — for a venue or a host. A tap opens the pod (sign-in first when
 * signed out, carrying the pod through it).
 */
export default function PodsScheduleBlock({ title, testId, pods, loading, empty }: Readonly<Props>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const openPod = useOpenPod();

  const onOpen = (podDocId: string) => {
    const pod = pods.find((p) => p.id === podDocId);
    if (pod) openPod(pod);
  };

  let body: ReactNode = <ClubPodsScheduleSection pods={pods} priceFormat={format} onOpen={onOpen} />;
  if (loading) {
    body = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 2 }}>
        <CircularProgress aria-label={t('mweb.a11y.loading')} size={20} />
      </Box>
    );
  } else if (pods.length === 0 && empty) {
    body = empty;
  }

  return (
    <Stack spacing={1.25} data-testid={testId}>
      <SectionHeader testId={`${testId}-header`} title={title} />
      {body}
    </Stack>
  );
}
