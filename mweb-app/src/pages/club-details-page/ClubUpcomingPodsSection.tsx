import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { Alert, Box, Button, Card, CardContent, CardMedia, LinearProgress, Stack, Typography } from '@mui/material';

interface Props {
  pods: any[];
  onOpen: (id: string) => void;
  priceFormat: (value: number) => string;
}

export default function ClubUpcomingPodsSection({ pods, onOpen, priceFormat }: Props) {
  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Upcoming pods
      </Typography>
      {pods.length === 0 ? (
        <Alert severity="info">No active pods in this club yet.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {pods.map((pod) => {
            const isFree = pod.pod_type?.includes('FREE');
            const placeText = [pod.place_label, pod.place_detail].filter(Boolean).join(' - ');
            const taken = pod.pod_attendees?.length ?? 0;
            const capacity = pod.no_of_spots || Math.max(taken, 1);
            const progress = Math.min(100, (taken / capacity) * 100);
            return (
              <Card key={pod.id} variant="outlined" sx={{ borderRadius: 4, bgcolor: 'background.paper', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                  {pod.pod_images_and_videos?.[0]?.url ? (
                    <CardMedia
                      component="img"
                      image={pod.pod_images_and_videos[0].url}
                      alt={pod.pod_title}
                      sx={{ width: 76, height: 76, borderRadius: 3, objectFit: 'cover', flex: '0 0 auto' }}
                    />
                  ) : (
                    <Box sx={{ width: 76, height: 76, borderRadius: 3, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, #ff8b5f 0%, #ed4f7a 100%)', flex: '0 0 auto' }}>
                      <EventIcon sx={{ color: 'common.white' }} />
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 950 }}>
                      {pod.pod_date_time
                        ? new Date(pod.pod_date_time).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
                        : 'UPCOMING'}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={950}
                      sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.15 }}
                    >
                      {pod.pod_title}
                    </Typography>
                    {placeText && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary', flex: '0 0 auto' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {placeText}
                        </Typography>
                      </Stack>
                    )}
                    <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, height: 4, borderRadius: 999 }} />
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.75 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>
                        {isFree ? 'Free' : priceFormat(pod.pod_amount)}
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onOpen(pod.id)}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 900,
                          minWidth: 66,
                          background: 'linear-gradient(135deg, #ff4f73 0%, #ff8b5f 100%)',
                          boxShadow: '0 10px 22px rgba(245,51,122,0.22)',
                          '&:hover': { background: 'linear-gradient(135deg, #ef3b63 0%, #f9794d 100%)' },
                        }}
                      >
                        Book
                      </Button>
                    </Stack>
                  </Box>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}