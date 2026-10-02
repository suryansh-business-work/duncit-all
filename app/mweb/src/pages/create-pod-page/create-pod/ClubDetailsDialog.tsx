import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import ClubSocialLinks from '../../club-details-page/ClubSocialLinks';
import { CREATE_POD_CLUB_DETAILS } from '../queries';
import ClubAdminContactRow, { type CreatePodClubAdmin } from './ClubAdminContactRow';
import type { CreatePodClub } from './create-pod.types';

interface ClubDetailsData {
  club: {
    id: string;
    rating: number;
    ratings_count: number;
    club_whats_app_community_link?: string | null;
    club_whats_app_group_link?: string | null;
    club_admins: CreatePodClubAdmin[];
  } | null;
}

interface Props {
  club: CreatePodClub;
  open: boolean;
  onClose: () => void;
}

/** Brief "View club details" — gallery strip, a clamped description, the club's
 * rating, its WhatsApp community + group chat and every admin's contact details.
 * The extras are read only once the dialog opens. Native twin: ClubDetailsSheet. */
export default function ClubDetailsDialog({ club, open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<ClubDetailsData>(CREATE_POD_CLUB_DETAILS, {
    variables: { club_doc_id: club.id },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const details = data?.club ?? null;
  const images = (club.club_feature_images_and_videos ?? []).filter((item) => (item.type ?? 'IMAGE') === 'IMAGE');

  let extras;
  if (loading && !details) {
    extras = <CircularProgress aria-label={t('mweb.a11y.loading')} size={22} sx={{ alignSelf: 'center' }} />;
  } else if (error || !details) {
    extras = <Alert severity="error">{t('mweb.createPod.clubDetailsLoadFailed')}</Alert>;
  } else {
    extras = (
      <>
        <Stack data-testid="club-preview-rating" direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <StarIcon fontSize="small" aria-hidden sx={{ color: 'warning.main' }} />
          {details.ratings_count > 0 ? (
            <Typography variant="body2">
              <Box component="span" sx={{ fontWeight: 700 }}>{details.rating.toFixed(1)}</Box>
              {' · '}
              {t('mweb.createPod.clubRatingsCount', { count: details.ratings_count })}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.createPod.clubNoRatings')}
            </Typography>
          )}
        </Stack>
        <ClubSocialLinks club={details} />
        <Stack spacing={1.25}>
          <Typography variant="subtitle2">{t('mweb.createPod.clubAdmins')}</Typography>
          {details.club_admins.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.podDetails.clubAdminsEmpty')}
            </Typography>
          ) : (
            details.club_admins.map((admin) => <ClubAdminContactRow key={admin.id} admin={admin} />)
          )}
        </Stack>
      </>
    );
  }

  return (
    <Dialog data-testid="club-preview-dialog" open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography component="span" sx={{ flex: 1, fontSize: '1.05rem', fontWeight: 600 }} noWrap>
          {club.club_name}
        </Typography>
        <DuncitRoundButton data-testid="club-preview-close" tone="surface" aria-label={t('mweb.createPod.closeClubDetails')} onClick={onClose}>
          <CloseIcon />
        </DuncitRoundButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.75}>
          {images.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
              {images.map((item) => (
                <Box
                  key={item.url}
                  component="img"
                  src={item.url}
                  alt={club.club_name}
                  sx={{ width: 88, height: 66, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                />
              ))}
            </Stack>
          )}
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {club.club_description?.trim() || t('mweb.createPod.noDescription')}
          </Typography>
          {open && extras}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
