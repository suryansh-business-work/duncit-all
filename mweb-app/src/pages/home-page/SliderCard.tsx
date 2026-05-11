import { Box, Card, CardActionArea, CardMedia, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';

export default function SliderCard({ slider }: { slider: any }) {
  const navigate = useNavigate();
  const target: string = slider.effective_link_url ?? slider.link_url ?? '';
  const isInternal = slider.link_type === 'INTERNAL' && target.startsWith('/');
  const clickable = !!target;

  const open = () => {
    if (!clickable) return;
    if (isInternal) navigate(target);
    else window.open(target, '_blank', 'noreferrer');
  };

  return (
    <Card
      elevation={0}
      square
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        width: '100%',
        height: { xs: 180, sm: 240, md: 280 },
      }}
    >
      <CardActionArea
        onClick={open}
        disabled={!clickable}
        sx={{ display: 'block', width: '100%', height: '100%' }}
      >
        {slider.media_type === 'VIDEO' ? (
          <CardMedia
            component="video"
            src={slider.media_url}
            autoPlay
            muted
            loop
            playsInline
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <CardMedia
            component="img"
            image={slider.media_url}
            alt={slider.title}
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{
                lineHeight: 1.25,
                mb: slider.description ? 0.5 : 0,
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {slider.title}
            </Typography>
            {slider.description && (
              <Typography
                variant="caption"
                sx={{ lineHeight: 1.4, display: 'block', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {slider.description}
              </Typography>
            )}
          </Box>
          {clickable && (
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
