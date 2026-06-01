import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import type { PortalRow } from './PortalMappingTable';

interface Props {
  row: PortalRow | null;
  onClose: () => void;
}

/** Read-only dialog listing the env configs a portal currently uses. */
export default function PortalInfoDialog({ row, onClose }: Props) {
  const groups = new Map<string, PortalRow['entries']>();
  for (const entry of row?.entries ?? []) {
    if (!groups.has(entry.category)) groups.set(entry.category, []);
    groups.get(entry.category)!.push(entry);
  }

  return (
    <Dialog open={!!row} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {row?.portal.name} — assigned configs
        <Typography variant="body2" color="text.secondary">{row?.portal.key}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {Array.from(groups.entries()).map(([category, entries], idx) => (
          <Box key={category}>
            {idx > 0 && <Divider sx={{ my: 1 }} />}
            <Typography variant="overline" color="text.secondary">{category}</Typography>
            <List dense disablePadding>
              {entries.map((entry) => (
                <ListItem key={entry.id} disableGutters>
                  <ListItemText
                    primary={entry.name}
                    secondary={entry.description || undefined}
                  />
                  <Stack direction="row" spacing={0.5}>
                    {entry.is_default && <Chip size="small" color="primary" label="Default" />}
                    <Chip
                      size="small"
                      variant="outlined"
                      color={entry.is_active ? 'success' : 'default'}
                      label={entry.is_active ? 'Active' : 'Off'}
                    />
                  </Stack>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
