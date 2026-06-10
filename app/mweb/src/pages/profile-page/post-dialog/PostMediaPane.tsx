import { Box } from '@mui/material';

interface PostMediaPaneProps {
  imageUrl: string;
  caption?: string | null;
}

export default function PostMediaPane({ imageUrl, caption }: Readonly<PostMediaPaneProps>) {
  return (
    <Box
      sx={{
        flex: { md: 1.4 },
        bgcolor: 'common.black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxHeight: { xs: 360, md: 'auto' },
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={caption || 'post'}
        sx={{
          maxWidth: '100%',
          maxHeight: { xs: 360, md: '80vh' },
          objectFit: 'contain',
        }}
      />
    </Box>
  );
}
