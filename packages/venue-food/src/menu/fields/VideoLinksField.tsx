import { useState } from 'react';
import { FormHelperText, Link, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import VideocamIcon from '@mui/icons-material/Videocam';
import YouTubeIcon from '@mui/icons-material/YouTube';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { MediaPickerDialog, type UploadSurface } from '@duncit/media-picker';
import { VENUE_VIDEO_FOLDER, venueVideoOf } from '@duncit/forms/schemas';
import YoutubeLinkInput from './YoutubeLinkInput';

export interface VideoLinksFieldProps {
  videos: string[];
  onChange: (videos: string[]) => void;
  /** The most videos the list may hold — from the registration config. */
  limit: number;
  /** Whose videos these are ("Paneer Tikka", the venue's name) — for the upload button's label. */
  name: string;
  /** The venue the uploads are filed under; none before its first save. */
  venueId?: string;
  surface: UploadSurface;
  /** Roots the test ids. */
  testId: string;
  error?: string;
  disabled?: boolean;
}

/**
 * A list of videos — each an uploaded clip (the ImageKit video pipeline, via
 * the shared picker) or a YouTube link — with a remove button each. One field
 * for a venue's own videos (the Partners venue form, the Venues console
 * editor) and a dish's (the menu editor). The kind is read from the address
 * (`venueVideoOf`), so both live in one plain list.
 */
export default function VideoLinksField({
  videos,
  onChange,
  limit,
  name,
  venueId,
  surface,
  testId,
  error,
  disabled,
}: Readonly<VideoLinksFieldProps>) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const atLimit = videos.length >= limit;
  const add = (url: string) => onChange(Array.from(new Set([...videos, url])));

  return (
    <Stack spacing={1} data-testid={testId}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.videos.title', { vars: { used: videos.length, max: limit } })}
        </Typography>
        <DuncitButton
          size="small"
          startIcon={<VideoCallIcon />}
          disabled={disabled || atLimit}
          aria-label={t('venueFoodOwner.videos.uploadFor', { vars: { name } })}
          onClick={() => setPickerOpen(true)}
          data-testid={`${testId}-upload`}
        >
          {t('venueFoodOwner.videos.upload')}
        </DuncitButton>
      </Stack>
      {videos.length > 0 && (
        <List dense disablePadding>
          {videos.map((url, index) => {
            const video = venueVideoOf(url);
            const youtube = video?.kind === 'YOUTUBE';
            const label = youtube
              ? t('venueFoodOwner.videos.youtubeItem', { vars: { n: index + 1 } })
              : t('venueFoodOwner.videos.fileItem', { vars: { n: index + 1 } });
            return (
              <ListItem
                key={url}
                disableGutters
                secondaryAction={
                  <DuncitIconButton
                    size="small"
                    disabled={disabled}
                    aria-label={t('venueFoodOwner.videos.remove', { vars: { n: index + 1 } })}
                    onClick={() => onChange(videos.filter((_url, itemIndex) => itemIndex !== index))}
                  >
                    <DeleteIcon fontSize="small" />
                  </DuncitIconButton>
                }
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{youtube ? <YouTubeIcon color="error" /> : <VideocamIcon />}</ListItemIcon>
                <ListItemText
                  primary={
                    <Link href={youtube ? video.watchUrl : url} target="_blank" rel="noopener noreferrer">
                      {label}
                    </Link>
                  }
                  secondary={url}
                  slotProps={{ secondary: { noWrap: true } }}
                />
              </ListItem>
            );
          })}
        </List>
      )}
      {!atLimit && <YoutubeLinkInput onAdd={add} disabled={disabled} testId={testId} />}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(url) => {
          add(url);
          setPickerOpen(false);
        }}
        folder={VENUE_VIDEO_FOLDER}
        entityId={venueId}
        surface={surface}
        accept="video/*"
        title={t('venueFoodOwner.videos.uploadFor', { vars: { name } })}
      />
    </Stack>
  );
}
