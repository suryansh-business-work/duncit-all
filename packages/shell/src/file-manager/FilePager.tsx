import { CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { PAGE_SIZE } from './queries';

interface Props {
  page: number;
  /** How many files this page actually holds. */
  count: number;
  loading: boolean;
  hasMore: boolean;
  onPage: (page: number) => void;
}

/** Previous / next, with the range on screen between them. */
export default function FilePager({ page, count, loading, hasMore, onPage }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        justifyContent: "center",
        pt: 3
      }}>
      <DuncitButton
        size="small"
        disabled={page === 0 || loading}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </DuncitButton>
      {/* The spinner sits in the pager, where the click was — a bar at the
          top of a scrolled dialog is somewhere nobody is looking. */}
      {loading ? (
        <CircularProgress size={18} />
      ) : (
        <Typography variant="body2">
          {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + count}
        </Typography>
      )}
      <DuncitButton
        size="small"
        disabled={!hasMore || loading}
        onClick={() => onPage(page + 1)}
      >
        Next
      </DuncitButton>
    </Stack>
  );
}
