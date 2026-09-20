import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';

/** One headed list of short points from an AI answer — nothing when the list is empty. */
export default function AiPoints({ title, points }: Readonly<{ title: string; points: string[] }>) {
  if (points.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" component="h4">
        {title}
      </Typography>
      <List dense disablePadding>
        {points.map((point) => (
          <ListItem key={point} disableGutters sx={{ py: 0.25, display: 'list-item', listStyleType: 'disc', ml: 2.5 }}>
            <ListItemText primary={point} slotProps={{ primary: { variant: 'body2' } }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
