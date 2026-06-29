import { useEffect, useRef, useState } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem, Stack } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExploreActionButton from './ExploreActionButton';

export interface ExploreAction {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
  tooltip?: string;
  onLabelClick?: () => void;
}

/** Approx pitch of one action (button 42 + caption + gap) — used to decide how
 * many fit before the rest collapse into the "More" menu. */
const ITEM_PITCH = 72;

/** Decide how many actions are shown inline vs. moved into the More menu, given
 * the available vertical space. Exported for unit testing. */
export function railLayout(total: number, available: number, pitch = ITEM_PITCH) {
  if (available <= 0) return { visible: total, overflow: false };
  const capacity = Math.max(1, Math.floor(available / pitch));
  if (total <= capacity) return { visible: total, overflow: false };
  // Reserve one slot for the More button itself.
  return { visible: Math.max(0, capacity - 1), overflow: true };
}

/**
 * Right-side reels action rail that never overlaps the content: it measures the
 * space it actually has and shows as many actions as fit by screen height; any
 * remainder collapses into a "More" (⋮) menu. Fully dynamic on resize.
 */
export default function ExploreActionRail({ actions }: Readonly<{ actions: ExploreAction[] }>) {
  const ref = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setAvailable(el.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { visible, overflow } = railLayout(actions.length, available);
  const shown = overflow ? actions.slice(0, visible) : actions;
  const hidden = overflow ? actions.slice(visible) : [];

  return (
    <Stack
      ref={ref}
      spacing={1.5}
      alignItems="center"
      justifyContent="flex-end"
      sx={{
        position: 'absolute',
        right: 12,
        top: 'calc(env(safe-area-inset-top) + 64px)',
        bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 110px)',
      }}
    >
      {shown.map((action) => (
        <ExploreActionButton
          key={action.key}
          icon={action.icon}
          label={action.label}
          onClick={action.onClick}
          active={action.active}
          loading={action.loading}
          tooltip={action.tooltip}
          onLabelClick={action.onLabelClick}
        />
      ))}
      {overflow && (
        <div ref={moreRef}>
          <ExploreActionButton
            icon={<MoreVertIcon />}
            label="More"
            tooltip="More actions"
            onClick={() => setMenuOpen(true)}
          />
        </div>
      )}
      <Menu
        anchorEl={moreRef.current}
        open={menuOpen && hidden.length > 0}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: 'center', horizontal: 'left' }}
        transformOrigin={{ vertical: 'center', horizontal: 'right' }}
      >
        {hidden.map((action) => (
          <MenuItem
            key={action.key}
            selected={action.active}
            onClick={() => {
              setMenuOpen(false);
              action.onClick();
            }}
          >
            <ListItemIcon sx={{ color: action.active ? 'primary.main' : 'inherit' }}>{action.icon}</ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontWeight: 700 }}>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
