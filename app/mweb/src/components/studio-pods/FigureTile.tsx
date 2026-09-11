import { Box, Typography } from '@mui/material';

/**
 * One stat tile — a caption over a bold figure, on the soft fill so it reads
 * inside a card. The studio figures strip and Venue Studio's slot-earnings
 * strip both lay these out (rule 40).
 */
export default function FigureTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box
      sx={{
        flex: '1 1 28%',
        minWidth: 96,
        p: 1.5,
        borderRadius: '16px',
        bgcolor: 'action.hover',
      }}
    >
      <Typography
        variant="caption"
        noWrap
        sx={{
          display: 'block',
          color: "text.secondary",
          fontWeight: 600
        }}>
        {label}
      </Typography>
      <Typography noWrap sx={{ mt: 0.25, fontSize: '1.125rem', fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}
