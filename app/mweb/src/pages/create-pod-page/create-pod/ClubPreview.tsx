import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import type { CreatePodClub } from './create-pod.types';

interface Props {
  club: CreatePodClub | null;
}

/** Selected-club preview — photo + name with a "View club details" dialog
 * showing the club's gallery and description (create-pod step 2). */
export default function ClubPreview({ club }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  if (!club) return null;
  const images = (club.club_feature_images_and_videos ?? []).filter(
    (item) => (item.type ?? 'IMAGE') === 'IMAGE'
  );
  const cover = images[0]?.url;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      sx={{ p: 1.25, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
    >
      <Avatar variant="rounded" src={cover} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
        <GroupsIcon />
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
          {club.club_name}
        </Typography>
        <Button size="small" onClick={() => setOpen(true)} sx={{ p: 0, fontWeight: 900 }}>
          View club details
        </Button>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', pr: 1 }}>
          <Typography component="span" sx={{ flex: 1, fontWeight: 900 }} noWrap>
            {club.club_name}
          </Typography>
          <IconButton size="small" aria-label="Close club details" onClick={() => setOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
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
                    sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                  />
                ))}
              </Stack>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {club.club_description?.trim() || 'No description yet.'}
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
