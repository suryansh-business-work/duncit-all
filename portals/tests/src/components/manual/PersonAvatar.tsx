import { memo } from 'react';
import { Avatar } from '@mui/material';
import type { ManualPerson } from '../../pages/manual/shared/types';

interface Props {
  person: ManualPerson;
  /** Theme spacing units; 3 is the card size. */
  size?: number;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** A staff member's photo, or their initials when they have none. Named for screen readers. */
export const PersonAvatar = memo(function PersonAvatar({ person, size = 3 }: Readonly<Props>) {
  // A photo is named by its alt; initials need the name on the avatar itself.
  const named = person.photo ? {} : { role: 'img', 'aria-label': person.name };
  return (
    <Avatar
      src={person.photo || undefined}
      alt={person.name}
      {...named}
      sx={(theme) => ({
        width: theme.spacing(size),
        height: theme.spacing(size),
        fontSize: theme.typography.caption.fontSize,
      })}
    >
      {initials(person.name)}
    </Avatar>
  );
});
