import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import { TOURS, isTourCompleted } from '@duncit/tours';
import { useTours } from '../../tours/useTours';

/**
 * Tour Guide centre — every guided walkthrough, restartable at any time.
 *
 * The list comes from `@duncit/tours`, so adding a screen's tour is one registry
 * entry and it appears here (and in the native centre) with no change to this
 * page. Starting a tour navigates to the screen it runs on and arms it; the
 * Joyride runtime picks it up when that screen mounts.
 */
export default function TourGuidePage() {
  const navigate = useNavigate();
  const { completed, startTour } = useTours();

  return (
    <Stack
      spacing={2}
      sx={{ maxWidth: 720, mx: 'auto', width: '100%', p: { xs: 1.5, sm: 2 }, pb: { xs: 10, sm: 8 } }}
    >
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} size="small">
          Back
        </Button>
      </Box>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{ fontWeight: 950 }}>
          Tour Guide
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
          Take a guided walkthrough of any screen, as often as you like.
        </Typography>
      </Stack>
      <Stack spacing={1.5}>
        {TOURS.map((tour) => {
          const done = isTourCompleted(completed, tour.id);
          return (
            <Card key={tour.id} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {tour.title}
                      </Typography>
                      {done && <Chip size="small" label="Completed" color="success" />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {tour.caption}
                    </Typography>
                  </Stack>
                  <Button
                    variant="contained"
                    size="small"
                    data-testid={`tour-start-${tour.id}`}
                    startIcon={done ? <ReplayIcon /> : <PlayArrowIcon />}
                    onClick={() => startTour(tour.id)}
                    sx={{ flexShrink: 0 }}
                  >
                    {done ? 'Restart' : 'Start'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
