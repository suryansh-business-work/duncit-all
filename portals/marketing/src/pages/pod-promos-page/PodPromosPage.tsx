import { useRef, useState } from 'react';
import { Stack } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { useUserData } from '@duncit/user-context';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import RunsGuide from '../activity-page/RunsGuide';
import { canManagePodPromos } from './roles';
import PromoSummaryCards from './summary/PromoSummaryCards';
import SettingsCard from './settings/SettingsCard';
import PromosTable from './promos/PromosTable';
import MakeBannersDialog from './banners/MakeBannersDialog';

const TOUR_ID = 'marketing.podPromos';

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'pod-promo-summary', title: t('marketing.podPromo.tourSummaryTitle'), body: t('marketing.podPromo.tourSummaryBody') },
  { anchor: 'pod-promo-settings', title: t('marketing.podPromo.tourSettingsTitle'), body: t('marketing.podPromo.tourSettingsBody') },
  { anchor: 'pod-promo-table', title: t('marketing.podPromo.tourTableTitle'), body: t('marketing.podPromo.tourTableBody') },
  { anchor: 'pod-promo-preview', title: t('marketing.podPromo.tourPreviewTitle'), body: t('marketing.podPromo.tourPreviewBody') },
];

/**
 * Publishing › Pod promotions: every upcoming pod gets a banner made from its
 * own data and an Instagram post scheduled a set number of days before it
 * starts, carrying a tracking link — then clicks, bookings and payments are
 * read back per post.
 */
export default function PodPromosPage() {
  const { t } = useTranslation();
  const { user } = useUserData();
  const canManage = canManagePodPromos(user?.roles);
  const [making, setMaking] = useState(false);
  const refetchRef = useRef<(() => void) | null>(null);

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="pod-promos-page">
      <PageHeader
        title={t('marketing.podPromo.title')}
        subtitle={t('marketing.podPromo.subtitle')}
        actions={
          <DuncitButton variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setMaking(true)} data-testid="pod-promos-make-banners">
            {t('marketing.podPromo.makeBanners')}
          </DuncitButton>
        }
      />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.podPromo.introSummary')}
        steps={[t('marketing.podPromo.introStep1'), t('marketing.podPromo.introStep2'), t('marketing.podPromo.introStep3')]}
        tour={tourSteps(t)}
      />
      <PromoSummaryCards />
      <SettingsCard canManage={canManage} />
      <PromosTable canManage={canManage} refetchRef={refetchRef} />
      <MakeBannersDialog
        open={making}
        pod={null}
        collaborators={null}
        canManage={canManage}
        onClose={() => setMaking(false)}
        onScheduled={() => {
          setMaking(false);
          refetchRef.current?.();
        }}
      />
    </Stack>
  );
}
