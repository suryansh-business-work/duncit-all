import { Box, Stack, Typography } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';

/** The page's title row and the one line under it that says what the library is for. */
export function LibraryHeader({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
      <Box>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <AutoStoriesIcon color="primary" />
          <Typography variant="h5" component="h1" sx={{
            fontWeight: 800
          }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {subtitle}
        </Typography>
      </Box>
  );
}
