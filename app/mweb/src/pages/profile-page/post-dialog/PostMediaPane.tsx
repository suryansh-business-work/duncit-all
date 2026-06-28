import { useRef, useState } from 'react';
import { Box, Fade, keyframes } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

const DOUBLE_TAP_MS = 280;
const BURST_MS = 700;

const burstPop = keyframes`
  0% { transform: scale(0.4); opacity: 0; }
  40% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.25); opacity: 0; }
`;

interface PostMediaPaneProps {
  imageUrl: string;
  caption?: string | null;
  /** Liked only — double-tap never unlikes (Instagram-style). */
  onDoubleTapLike: () => void;
}

export default function PostMediaPane({
  imageUrl,
  caption,
  onDoubleTapLike,
}: Readonly<PostMediaPaneProps>) {
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);

  const onClick = () => {
    const now = Date.now();
    if (now - lastTap.current > DOUBLE_TAP_MS) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    onDoubleTapLike();
    setBurst(true);
    setTimeout(() => setBurst(false), BURST_MS);
  };

  return (
    <Box
      data-testid="post-media"
      onClick={onClick}
      sx={{
        position: 'relative',
        flex: { md: 1.4 },
        bgcolor: 'common.black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxHeight: { xs: 360, md: 'auto' },
        cursor: 'pointer',
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={caption || 'post'}
        sx={{ maxWidth: '100%', maxHeight: { xs: 360, md: '80vh' }, objectFit: 'contain' }}
      />
      <Fade in={burst} timeout={180}>
        <FavoriteIcon
          data-testid="post-like-burst"
          sx={{
            position: 'absolute',
            fontSize: 120,
            color: 'common.white',
            pointerEvents: 'none',
            animation: `${burstPop} ${BURST_MS}ms ease-out`,
          }}
        />
      </Fade>
    </Box>
  );
}
