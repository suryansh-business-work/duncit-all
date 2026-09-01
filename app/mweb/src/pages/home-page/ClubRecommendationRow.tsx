import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Box, Card, Stack, Typography } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { DuncitButton } from '@duncit/buttons';
import { useFollowedClubs } from '../../hooks/useFollowedClubs';
import { useTranslation } from '../../i18n/useTranslation';
import { clubUrl } from '../../utils/seoUrls';

/**
 * Random club recommendation (mock: "The Smashers United · Join Club"). One
 * club is picked at random per visit — preferring clubs the viewer doesn't
 * follow yet — and Join follows it in place. The row itself opens the club.
 */
export default function ClubRecommendationRow({
  clubs,
  locations = [],
}: Readonly<{ clubs: any[]; locations?: any[] }>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isFollowing, follow, loading } = useFollowedClubs();

  // Stable per mount: the id is rolled once and re-resolved on refetches, so a
  // background refresh never swaps the recommendation mid-view.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const club = useMemo(() => {
    const byId = pickedId ? clubs.find((c: any) => c.id === pickedId) : null;
    if (byId) return byId;
    if (clubs.length === 0) return null;
    const fresh = clubs.filter((c: any) => !isFollowing(c.id));
    const pool = fresh.length > 0 ? fresh : clubs;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setPickedId(next.id);
    return next;
    // isFollowing is deliberately absent: a follow must not re-roll the pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, pickedId]);

  if (!club) return null;

  const image = club.club_feature_images_and_videos?.find((m: any) => m.type !== 'VIDEO')?.url;
  const members: number = club.followers_count ?? 0;
  let membersLabel = '';
  if (members === 1) membersLabel = t('mweb.home.membersOne');
  else if (members > 1) membersLabel = t('mweb.home.membersMany', { count: members });
  const cityName = locations.find((l: any) => l.id === club.location_id)?.location_name ?? '';
  const meta = [cityName, membersLabel].filter(Boolean).join(' · ');
  const joined = isFollowing(club.id);

  return (
    <Card
      onClick={() => navigate(clubUrl(club.club_id ?? club.id))}
      sx={{ p: 1.25, borderRadius: '18px', cursor: 'pointer' }}
    >
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <Avatar src={image} alt={club.club_name} sx={{ width: 46, height: 46 }}>
          {club.club_name?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: "center",
              minWidth: 0
            }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {club.club_name}
            </Typography>
            {club.is_verified && (
              <VerifiedIcon sx={{ fontSize: 15, color: 'primary.main', flex: '0 0 auto' }} />
            )}
          </Stack>
          {meta && (
            <Typography
              variant="caption"
              noWrap
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              {meta}
            </Typography>
          )}
        </Box>
        <DuncitButton
          variant="outlined"
          size="small"
          disabled={joined || loading}
          onClick={(event) => {
            event.stopPropagation();
            follow(club.id).catch(() => undefined);
          }}
          sx={{ flex: '0 0 auto', fontWeight: 700 }}
        >
          {joined ? t('mweb.home.joinedClub') : t('mweb.home.joinClub')}
        </DuncitButton>
      </Stack>
    </Card>
  );
}
