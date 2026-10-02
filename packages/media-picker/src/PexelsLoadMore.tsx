import { Box, CircularProgress } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

interface Props {
  searching: boolean;
  onLoadMore: () => void;
}

/** The next-page button under a Pexels grid. */
export default function PexelsLoadMore({ searching, onLoadMore }: Readonly<Props>) {
  return (
    <Box sx={{ textAlign: 'center', mt: 2 }}>
      <DuncitButton
        onClick={onLoadMore}
        disabled={searching}
        startIcon={searching ? <CircularProgress size={14} /> : null}
      >
        Load more
      </DuncitButton>
    </Box>
  );
}
