import { useState } from 'react';
import { Avatar } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_RADII } from '../../shared/tokens';
import { initialsOf } from '../lib/text';

interface UserAvatarProps {
  name: string;
  url: string | null | undefined;
  size?: number;
  /** A rounded square (a calendar's mark) instead of a person's circle. */
  square?: boolean;
}

/** A person's picture, or their initials when there is none or it fails to load. */
export function UserAvatar({ name, url, size = 40, square = false }: Readonly<UserAvatarProps>) {
  const [failed, setFailed] = useState(false);
  const { source, isFallback } = resolveIconSource(url, '', failed);
  return (
    <Avatar
      src={isFallback ? undefined : source}
      alt=""
      variant={square ? 'rounded' : 'circular'}
      slotProps={{ img: { onError: () => setFailed(true) } }}
      sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText', ...(square ? { borderRadius: `${LITE_RADII.control}px` } : {}) }}
      data-testid="user-avatar"
    >
      {initialsOf(name)}
    </Avatar>
  );
}
