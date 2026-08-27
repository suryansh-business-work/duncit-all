import { useState } from 'react';
import { Avatar, Box, Chip, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodClub } from './create-pod.types';

interface Props {
  club: CreatePodClub | null;
}

/** Selected-club preview — photo + name with a "View club details" dialog
 * showing the club's gallery and description (create-pod step 2). */
export default function ClubPreview({ club }: Readonly<Props>) {
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
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: "center",
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover'
      }}>
      <Avatar variant="rounded" src={cover} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
        <GroupsIcon />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
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
            size="small"
            variant="outlined"
            icon={<StorefrontOutlinedIcon />}
            label={venueLabel}
          />
          <DuncitButton size="small" onClick={() => setOpen(true)} sx={{ p: 0, fontWeight: 700 }}>
            {t('mweb.createPod.viewClubDetails')}
          </DuncitButton>
        </Stack>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', pr: 1 }}>
          <Typography component="span" sx={{ flex: 1, fontWeight: 700 }} noWrap>
            {club.club_name}
          </Typography>
          <DuncitIconButton size="small" aria-label={t('mweb.createPod.closeClubDetails')} onClick={() => setOpen(false)}>
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {images.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                {images.map((item) => (
                  <Box
                    key={item.url}
                    component="img"
                    src={item.url}
                    alt={club.club_name}
                    sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: '16px', flexShrink: 0 }}
                  />
                ))}
              </Stack>
            )}
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                whiteSpace: 'pre-wrap'
              }}>
              {club.club_description?.trim() || t('mweb.createPod.noDescription')}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
