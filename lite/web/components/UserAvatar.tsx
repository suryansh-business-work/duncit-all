import { useState } from 'react';
import { Avatar } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { initialsOf } from '../lib/text';

interface UserAvatarProps {
  name: string;
  url: string | null | undefined;
  size?: number;
}

/** A person's picture, or their initials when there is none or it fails to load. */
export function UserAvatar({ name, url, size = 40 }: Readonly<UserAvatarProps>) {
  const [failed, setFailed] = useState(false);
  const { source, isFallback } = resolveIconSource(url, '', failed);
  return (
    <Avatar
      src={isFallback ? undefined : source}
      alt=""
      slotProps={{ img: { onError: () => setFailed(true) } }}
      sx={{ width: size, height: size, fontSize: size * 0.4, fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}
      data-testid="user-avatar"
    >
      {initialsOf(name)}
    </Avatar>
  );
}
