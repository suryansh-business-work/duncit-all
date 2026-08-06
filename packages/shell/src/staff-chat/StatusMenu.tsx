import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import PresenceDot from './PresenceDot';
import type { PresenceStatus } from './usePresence';

const OPTIONS: { value: PresenceStatus; label: string; hint: string }[] = [
  { value: 'ONLINE', label: 'Online', hint: 'At your desk' },
  { value: 'AWAY', label: 'Away', hint: 'Connected, not looking' },
  { value: 'BUSY', label: 'Busy', hint: 'Please do not disturb' },
  { value: 'OFFLINE', label: 'Appear offline', hint: 'Still connected, shown as away' },
];

/**
 * Your own status.
 *
 * Choosing one also stops the idle timer overriding it: someone who set Busy
 * did not ask to be marked Away ten minutes later.
 */
export default function StatusMenu({
  status,
  onChange,
}: Readonly<{ status: PresenceStatus; onChange: (next: PresenceStatus) => void }>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = OPTIONS.find((option) => option.value === status) ?? OPTIONS[0];

  return (
    <>
      <Button
        size="small"
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={
          <PresenceDot status={status}>
            <span style={{ width: 8, display: 'inline-block' }} />
          </PresenceDot>
        }
      >
        {current.label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === status}
            onClick={() => {
              onChange(option.value);
              setAnchor(null);
            }}
          >
            {option.label} — {option.hint}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
