import { Box, Card, CardActionArea, CardMedia, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function SliderCard({ slider }: { slider: any }) {
  const open = () => {
    if (slider.link_url) window.open(slider.link_url, '_blank', 'noreferrer');
  };
  return (
    <Card sx={{ position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
      <CardActionArea onClick={open} disabled={!slider.link_url}>
        {slider.media_type === 'VIDEO' ? (
          <CardMedia
            component="video"
            src={slider.media_url}
            autoPlay
            muted
            loop
            playsInline
            sx={{ height: { xs: 160, sm: 220 }, objectFit: 'cover' }}
          />
        ) : (
          <CardMedia
            component="img"
            image={slider.media_url}
            alt={slider.title}
            sx={{ height: { xs: 160, sm: 220 }, objectFit: 'cover' }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.65) 100%)',
            color: 'common.white',
            display: 'flex',
            alignItems: 'flex-end',
            p: 2,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              {slider.title}
            </Typography>
            {slider.description && (
              <Typography variant="caption">{slider.description}</Typography>
            )}
          </Box>
          {slider.link_url && (
            <Box
              component="span"
              sx={{
                color: 'common.white',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.35)',
              }}
            >
              <OpenInNewIcon />
            </Box>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
}
