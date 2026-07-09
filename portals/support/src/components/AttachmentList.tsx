import { Box, Chip, Stack, Typography } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import { describeAttachment, typeLabel, type AttachmentInfo } from '../lib/attachment';

interface DocCardProps {
  info: AttachmentInfo;
}

/** Document/other file card: icon + file name + type badge + open/download link. */
function DocCard({ info }: Readonly<DocCardProps>) {
  return (
    <Chip
      component="a"
      href={info.url}
      target="_blank"
      rel="noopener noreferrer"
      clickable
      variant="outlined"
      icon={<InsertDriveFileIcon />}
      label={
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ maxWidth: 200 }}>
          <Typography variant="caption" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
            {info.name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            {typeLabel(info.ext)}
          </Typography>
          <DownloadIcon sx={{ fontSize: 15, opacity: 0.7 }} />
        </Stack>
      }
      sx={{ height: 'auto', py: 0.5, bgcolor: 'background.paper', color: 'text.primary' }}
    />
  );
}

/** Video preview card with a native player + file name. */
function VideoCard({ info }: Readonly<DocCardProps>) {
  return (
    <Box sx={{ maxWidth: 220 }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={info.url}
        controls
        preload="metadata"
        style={{ width: '100%', maxHeight: 160, borderRadius: 8, background: '#000' }}
      />
      <Typography variant="caption" noWrap sx={{ display: 'block', opacity: 0.8, mt: 0.25 }}>
        {info.name}
      </Typography>
    </Box>
  );
}

interface Props {
  urls: readonly string[];
  /** Thumbnail edge for images (px). */
  size?: number;
}

/** Type-aware attachment strip shared by the live-chat and ticket bubbles:
 * images render as thumbnails, videos as a preview player, documents as a
 * file card with name + type + download. */
export default function AttachmentList({ urls, size = 56 }: Readonly<Props>) {
  if (!urls.length) return null;
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
      {urls.map((url) => {
        const info = describeAttachment(url);
        if (info.kind === 'image') {
          return (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              <Box
                component="img"
                src={url}
                alt={info.name}
                sx={{ width: size, height: size, objectFit: 'cover', borderRadius: 1, display: 'block' }}
              />
            </a>
          );
        }
        if (info.kind === 'video') return <VideoCard key={url} info={info} />;
        return <DocCard key={url} info={info} />;
      })}
    </Stack>
  );
}
