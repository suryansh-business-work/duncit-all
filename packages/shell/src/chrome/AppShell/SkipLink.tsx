import { Box } from '@mui/material';

interface Props {
  /** The id of the page region the link jumps to. */
  targetId: string;
  label: string;
}

/** Off screen until focused: the first Tab stop on every console page. */
export function SkipLink({ targetId, label }: Readonly<Props>) {
  return (
    <Box
      component="a"
      href={`#${targetId}`}
      data-testid="app-shell-skip-link"
      sx={{
        position: 'absolute',
        left: -9999,
        zIndex: (theme) => theme.zIndex.tooltip,
        bgcolor: 'background.paper',
        color: 'primary.main',
        px: 2,
        py: 1,
        borderRadius: 1,
        fontWeight: 700,
        '&:focus': { left: 8, top: 8 },
      }}
    >
      {label}
    </Box>
  );
}
