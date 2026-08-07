import { useState } from 'react';
import {
  Avatar,
  Chip,
  Divider,
  IconButton,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ROLE_LABEL, type Coworker } from './queries';

interface Props {
  person: Coworker;
}

/**
 * Who you are about to write to.
 *
 * The row can only show two or three of someone's consoles before it wraps, and
 * a person with six is exactly the person you most need to identify — "which of
 * the four Rahuls runs Finance" is the question this answers. Everything they
 * have is in here, plus a way to reach them off-chat.
 */
export default function CoworkerInfoButton({ person }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Tooltip title={`About ${person.name}`}>
        <IconButton
          size="small"
          edge="end"
          aria-label={`About ${person.name}`}
          onClick={(event) => {
            // The row underneath opens the conversation; this does not.
            event.stopPropagation();
            setAnchor(event.currentTarget);
          }}
        >
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Stack spacing={1} sx={{ p: 1.5, width: 260 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={person.photo || undefined} sx={{ width: 36, height: 36 }} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                {person.name}
              </Typography>
              {person.email && (
                <Link
                  href={`mailto:${person.email}`}
                  variant="caption"
                  underline="hover"
                  color="text.secondary"
                  noWrap
                >
                  {person.email}
                </Link>
              )}
            </Stack>
          </Stack>

          <Divider />

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {person.roles.length === 1 ? 'Console' : 'Consoles'}
          </Typography>
          {person.roles.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              No staff console assigned.
            </Typography>
          ) : (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {person.roles.map((role) => (
                <Chip key={role} size="small" label={ROLE_LABEL[role] ?? role} />
              ))}
            </Stack>
          )}
        </Stack>
      </Popover>
    </>
  );
}
