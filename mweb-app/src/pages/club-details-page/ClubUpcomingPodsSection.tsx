import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import { Alert, Box, Card, CardActionArea, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';

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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {pods.map((pod) => {
            const isFree = pod.pod_type?.includes('FREE');
            const placeText = [pod.place_label, pod.place_detail].filter(Boolean).join(' - ');
            return (
              <Card key={pod.id} variant="outlined">
                <CardActionArea onClick={() => onOpen(pod.id)}>
                  {pod.pod_images_and_videos?.[0]?.url ? (
                    <CardMedia
                      component="img"
                      image={pod.pod_images_and_videos[0].url}
                      alt={pod.pod_title}
                      sx={{ height: 160, objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{ height: 160, display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
                      <EventIcon fontSize="large" color="action" />
                    </Box>
                  )}
                  <CardContent>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {pod.pod_title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {pod.pod_date_time
                        ? new Date(pod.pod_date_time).toLocaleString(undefined, {
                            weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                          })
                        : '—'}
                    </Typography>
                    {placeText && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        <PlaceIcon sx={{ fontSize: 14, color: 'text.secondary', flex: '0 0 auto' }} />
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {placeText}
                        </Typography>
                      </Stack>
                    )}
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <Chip
                        size="small"
                        label={isFree ? 'Free' : priceFormat(pod.pod_amount)}
                        color={isFree ? 'success' : 'primary'}
                        variant={isFree ? 'outlined' : 'filled'}
                      />
                      {pod.no_of_spots > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {pod.pod_attendees?.length ?? 0}/{pod.no_of_spots} spots
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}