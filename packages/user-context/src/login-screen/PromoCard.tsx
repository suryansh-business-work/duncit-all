import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { glass } from './glass';

interface Props {
  title: string;
  text: string;
  brandName: string;
}

/** Right-hand glass promo card (hidden on mobile by the parent). */
export default function PromoCard({ title, text, brandName }: Readonly<Props>) {
  const [firstWord, ...rest] = title.split(' ');
  return (
    <Box
      sx={(theme) => ({
        ...glass(theme),
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        width: '100%',
        minHeight: 460,
        p: 3.5,
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      {/* decorative blurred blob */}
      <Box
        sx={{
          position: 'absolute',
          right: -40,
          top: 120,
          width: 220,
          height: 220,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          opacity: 0.5,
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      />
      <Typography
        component="h2"
        sx={{
          fontWeight: 800,
          lineHeight: 1.05,
          position: 'relative',
          fontSize: 'clamp(1.9rem, 4.5vw, 2.5rem)',
          overflowWrap: 'anywhere',
        }}
      >
        <Box component="span" sx={{ color: 'text.primary' }}>
          {firstWord}
        </Box>
        {rest.length > 0 && (
          <>
            <br />
            <Box component="span" sx={{ color: 'text.disabled' }}>
              {rest.join(' ')}
            </Box>
          </>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, position: 'relative' }}>
        {text}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto', pt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          By {brandName}
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon />}
          sx={{
            borderRadius: 999,
            bgcolor: '#0b0b0f',
            color: '#fff',
            px: 2,
            '&:hover': { bgcolor: '#000' },
          }}
        >
          Explore
        </Button>
      </Stack>
    </Box>
  );
}
