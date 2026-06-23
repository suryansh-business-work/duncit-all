import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

interface Props {
  title: string;
  items: string[];
}

/** Admin-authored club content rendered as a bullet list (Who We Are, Perks…). */
export default function ClubBulletsSection({ title, items }: Readonly<Props>) {
  const bullets = items.filter((item) => item.trim().length > 0);
  if (bullets.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <List dense disablePadding>
        {bullets.map((item) => (
          <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 26, mt: 0.75 }}>
              <FiberManualRecordIcon sx={{ fontSize: 8, color: 'primary.main' }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: 'body2', sx: { whiteSpace: 'pre-wrap' } }}
              primary={item}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
