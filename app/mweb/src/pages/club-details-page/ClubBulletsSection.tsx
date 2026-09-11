import { Box, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SectionHeader from '../../components/SectionHeader';
import { SURFACE_SX } from '../../theme';

interface Props {
  title: string;
  items: string[];
}

/** Admin-authored club content rendered as a bullet list (Who We Are, Perks…). */
export default function ClubBulletsSection({ title, items }: Readonly<Props>) {
  const bullets = items.filter((item) => item.trim().length > 0);
  if (bullets.length === 0) return null;

  return (
    <Box sx={{ ...SURFACE_SX, p: 2 }}>
      <SectionHeader title={title} />
      <List dense disablePadding sx={{ mt: 1 }}>
        {bullets.map((item) => (
          <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 22, mt: 0.9 }}>
              <FiberManualRecordIcon sx={{ fontSize: 8, color: 'secondary.main' }} />
            </ListItemIcon>
            <ListItemText
              primary={item}
              slotProps={{
                primary: { variant: 'body2', sx: { whiteSpace: 'pre-wrap' } }
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
