import { useNavigate } from 'react-router';
import { Card, Stack, Typography } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { clubUrl } from '../../utils/seoUrls';
import { openPod } from '../../lib/open-pod';
import HomeRail from './HomeRail';
import PodCard from './PodCard';

interface ClubSectionProps {
  club: any;
  clubPods: any[];
  hostNameOf: (pod: any) => string | null;
  /** The category pill over each card's image (mock: "Sports"). */
  categoryLabelOf?: (pod: any) => string | null;
  /** Save state + toggle; omit to hide the save buttons (signed-out). */
  savedOf?: (podDocId: string) => boolean;
  /** True while THAT pod's toggle is in flight — its icon becomes a spinner. */
  savingOf?: (podDocId: string) => boolean;
  onToggleSave?: (podDocId: string) => void;
}

/** One club's rail: the club's name with "See all" (opens the club) above its
 * upcoming pods. Native twin: ClubSection. */
export default function ClubSection({ club, clubPods, hostNameOf, categoryLabelOf, savedOf, savingOf, onToggleSave }: Readonly<ClubSectionProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <SectionHeader
        title={club.club_name}
        actionLabel={t('mweb.home.seeAll')}
        onAction={() => navigate(clubUrl(club.club_id))}
      />

      {clubPods.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No upcoming pods in this club for the selected city.
          </Typography>
        </Card>
      ) : (
        <HomeRail>
          {clubPods.map((p) => (
            <PodCard
              key={p.id}
              pod={p}
              hostName={hostNameOf(p)}
              categoryLabel={categoryLabelOf?.(p)}
              saved={savedOf?.(p.id)}
              saving={savingOf?.(p.id)}
              onToggleSave={onToggleSave ? () => onToggleSave(p.id) : undefined}
              showPlace={false}
              onOpen={() => openPod(navigate, p)}
            />
          ))}
        </HomeRail>
      )}
    </Stack>
  );
}
