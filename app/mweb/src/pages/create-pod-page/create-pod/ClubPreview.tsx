import { useState } from 'react';
import { Avatar, Box, Chip, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodClub } from './create-pod.types';
import ClubSlotsChip from './steps/ClubSlotsChip';
import ClubDetailsDialog from './ClubDetailsDialog';

interface Props {
  club: CreatePodClub | null;
  /** Physical pods only — a virtual pod books no venue slot. */
  showSlots?: boolean;
}

/** Selected-club preview — photo + name with a brief "View club details" dialog
 * (gallery, description, rating, WhatsApp chats and admin contacts). */
export default function ClubPreview({ club, showSlots = false }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  if (!club) return null;
  const images = (club.club_feature_images_and_videos ?? []).filter(
    (item) => (item.type ?? 'IMAGE') === 'IMAGE'
  );
  const cover = images[0]?.url;
  const venueCount = club.matched_venues_count ?? 0;
  const venueLabel =
    venueCount === 1
      ? t('mweb.createPod.venueOne')
      : t('mweb.createPod.venueMany', { vars: { count: venueCount } });

  return (
    <Stack
      data-testid="club-preview"
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        p: 1.5,
        borderRadius: '16px',
        bgcolor: 'action.hover'
      }}>
      <Avatar
        variant="rounded"
        src={cover}
        alt=""
        sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: 'background.paper', color: 'secondary.main' }}
      >
        <GroupsIcon />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontSize: '0.95rem' }} noWrap>
          {club.club_name}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mt: 0.25
          }}>
          <Chip
            data-testid="club-preview-venue-count"
            size="small"
            variant="outlined"
            icon={<StorefrontOutlinedIcon />}
            label={venueLabel}
          />
          {showSlots && <ClubSlotsChip club={club} />}
          <DuncitButton data-testid="club-preview-details" size="small" onClick={() => setOpen(true)} sx={{ p: 0 }}>
            {t('mweb.createPod.viewClubDetails')}
          </DuncitButton>
        </Stack>
      </Box>

      <ClubDetailsDialog club={club} open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
