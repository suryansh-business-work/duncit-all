import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack, Typography } from '@mui/material';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import SectionCard from './SectionCard';
import { POD_CLUB_DETAIL } from './queries';
import { useTranslation } from './i18n/useTranslation';

interface Props {
  clubId: string | null;
}

/** The pod's club, and the way through to it. The people who administer it are
 * their own card (PodClubAdminsCard) — a name and a phone number are a contact,
 * not a property of the club row. */
export default function PodClubCard({ clubId }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(POD_CLUB_DETAIL, {
    variables: { id: clubId },
    skip: !clubId,
  });
  const club = data?.club;

  return (
    <SectionCard
      icon={<Diversity3Icon fontSize="small" />}
      title={t('podDetailsPanel.podClubCard.club')}
      loading={loading && !club}
      error={error?.message}
      empty={!error && !loading && !club ? t('podDetailsPanel.common.noClubLinked') : null}
      action={
        club && (
          <DuncitButton size="small" endIcon={<OpenInNewIcon />} onClick={() => navigate(`/clubs/${club.id}`)}>
            {t('podDetailsPanel.podClubCard.viewClub')}
          </DuncitButton>
        )
      }
    >
      {club && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "baseline",
            flexWrap: "wrap"
          }}>
          <Typography variant="body2" sx={{
            fontWeight: 800
          }}>
            {club.club_name}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            /{club.club_slug}
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
}
