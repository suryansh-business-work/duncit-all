import { useEffect, useState } from 'react';
import { Avatar, Box } from '@mui/material';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import MovieIcon from '@mui/icons-material/Movie';

export type MediaThumbKind = 'VIDEO' | 'IMAGE' | 'AUDIO' | 'FOLDER';

const ICONS = { VIDEO: MovieIcon, IMAGE: ImageIcon, AUDIO: AudiotrackIcon, FOLDER: FolderIcon } as const;

interface Props {
  kind: MediaThumbKind;
  /** The preview frame; empty when there is none. */
  src: string;
  size?: number;
}

/**
 * A file's preview frame, or the icon for its kind.
 *
 * The picture is a plain lazy image rather than an Avatar's: an Avatar preloads
 * its source the moment it mounts, and a Drive folder is a list of hundreds of
 * rows whose every preview is a request this server relays to Google. Lazy, only
 * the rows actually scrolled into view are fetched.
 *
 * When there is no frame, or it fails to load — a clip Drive is still processing
 * has none yet — the icon is shown instead of a broken image. Decorative either
 * way: the file's name is always written beside it.
 */
export default function MediaThumb({ kind, src, size = 44 }: Readonly<Props>) {
  const [failed, setFailed] = useState(false);
  const Icon = ICONS[kind];

  // A new address deserves a new attempt; the old failure says nothing about it.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        sx={{ width: size, height: size, borderRadius: 1, objectFit: 'cover', bgcolor: 'action.hover', flexShrink: 0 }}
      />
    );
  }

  return (
    <Avatar variant="rounded" sx={{ width: size, height: size, bgcolor: 'action.hover', color: 'text.secondary', flexShrink: 0 }}>
      <Icon fontSize="small" />
    </Avatar>
  );
}
