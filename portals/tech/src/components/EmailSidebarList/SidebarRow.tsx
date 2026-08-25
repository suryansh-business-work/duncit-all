import { Box, Chip, ListItemButton, ListItemText, Tooltip, Typography } from '@mui/material';
import type { SidebarItem } from './sidebar-view';

/**
 * One row, hoisted out of the list's `.map` so the list itself stays a list.
 *
 * The number down the left is the row's position in what is CURRENTLY visible,
 * not in the unfiltered set — a filtered or re-sorted list renumbers from 1.
 */
export default function SidebarRow({
  item,
  position,
  selected,
  onSelect,
}: Readonly<{
  item: SidebarItem;
  position: number;
  selected: boolean;
  onSelect: (key: string) => void;
}>) {
  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(item.key)}
      sx={{ alignItems: 'flex-start', gap: 1 }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          minWidth: 22,
          textAlign: 'right',
          pt: 0.35,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {position}
      </Typography>
      <ListItemText
        primary={item.primary}
        secondary={
          item.secondary ? (
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
              {item.secondary}
            </Box>
          ) : undefined
        }
        sx={{ my: 0 }}
      />
      {item.badge && (
        <Tooltip title={item.badge.title}>
          <Chip
            size="small"
            variant="outlined"
            color={item.badge.muted ? 'default' : 'primary'}
            label={item.badge.label}
            sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}
          />
        </Tooltip>
      )}
      {item.off && <Chip size="small" label="off" sx={{ mt: 0.25 }} />}
    </ListItemButton>
  );
}
