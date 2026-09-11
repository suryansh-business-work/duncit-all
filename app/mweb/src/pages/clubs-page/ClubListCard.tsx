import { Box, Card, CardMedia, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { DuncitButton } from '@duncit/buttons';
import { isVideoMedia, videoSourceUrl } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface ClubListCardProps {
  club: any;
  podCount: number;
  onOpen: () => void;
}

/** 18px media corners inside the card's own 24px ones. */
const COVER_SX = { height: 154, borderRadius: '18px' } as const;

/** A club on the Clubs list: the cover inside the card's padding, the name,
 * a muted pod count and a green Open pill. */
export default function ClubListCard({ club, podCount, onOpen }: Readonly<ClubListCardProps>) {
  const { t } = useTranslation();
  const cover = club.club_feature_images_and_videos?.[0];
  const coverIsVideo = isVideoMedia(cover);
  const coverMediaProps = coverIsVideo
    ? { autoPlay: true, muted: true, loop: true, playsInline: true }
    : { alt: club.club_name };

  return (
    <Card onClick={onOpen} sx={{ cursor: 'pointer', p: 1.5 }}>
      {cover?.url ? (
        <CardMedia
          component={coverIsVideo ? 'video' : 'img'}
          src={coverIsVideo ? videoSourceUrl(cover.url) : cover.url}
          sx={{ ...COVER_SX, objectFit: 'cover' }}
          {...coverMediaProps}
        />
      ) : (
        <Box sx={{ ...COVER_SX, bgcolor: 'action.hover', color: 'secondary.main', display: 'grid', placeItems: 'center' }}>
          <GroupsRoundedIcon sx={{ fontSize: 40 }} />
        </Box>
      )}
      <Stack spacing={0.5} sx={{ pt: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography sx={{ flex: 1, fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {club.club_name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, flex: '0 0 auto' }}>
            {t('mweb.clubsPage.podCount', { count: podCount })}
          </Typography>
        </Stack>
        {club.club_description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 40
            }}>
            {club.club_description}
          </Typography>
        )}
      </Stack>
      <DuncitButton
        fullWidth
        variant="contained"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={(event) => { event.stopPropagation(); onOpen(); }}
        sx={{ mt: 1.5 }}
      >
        {t('mweb.clubsPage.openClub')}
      </DuncitButton>
    </Card>
  );
}
