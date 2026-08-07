import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { useTranslation } from '../i18n/useTranslation';
import PresenceDot from './PresenceDot';
import type { PresenceStatus } from './usePresence';

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
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Built here rather than at module scope so each label is a literal t() call
  // — the key-verification gate reads the source, and a key assembled from a
  // status value would look unshipped to it.
  const options: { value: PresenceStatus; label: string; hint: string }[] = [
    {
      value: 'ONLINE',
      label: t('shell.chat.presence.online'),
      hint: t('shell.chat.presence.onlineHint'),
    },
    {
      value: 'AWAY',
      label: t('shell.chat.presence.away'),
      hint: t('shell.chat.presence.awayHint'),
    },
    {
      value: 'BUSY',
      label: t('shell.chat.presence.busy'),
      hint: t('shell.chat.presence.busyHint'),
    },
    {
      value: 'OFFLINE',
      label: t('shell.chat.presence.appearOffline'),
      hint: t('shell.chat.presence.appearOfflineHint'),
    },
  ];
  const current = options.find((option) => option.value === status) ?? options[0];

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
        {options.map((option) => (
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
