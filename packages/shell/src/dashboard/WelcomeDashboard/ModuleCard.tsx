import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { AppIcon } from '../../chrome/AppIcon';

/** One "coming soon" module tile. Each is its own widget, so a console can be
 *  rearranged around the module its team actually waits on. */
interface ModuleCardProps {
  icon: string;
  title: string;
  description: string;
  comingSoon: string;
}

export function ModuleCard({ icon, title, description, comingSoon }: Readonly<ModuleCardProps>) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={1}>
          <Box sx={{ color: 'primary.main' }}>
            <AppIcon name={icon} />
          </Box>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {description}
          </Typography>
          <Chip label={comingSoon} size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
