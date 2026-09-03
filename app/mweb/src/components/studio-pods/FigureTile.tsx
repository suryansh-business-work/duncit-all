import { Card, CardContent, Typography } from '@mui/material';

/**
 * One stat tile — a caption over a bold figure. The studio figures strip and
 * Venue Studio's slot-earnings strip both lay these out (rule 40).
 */
export default function FigureTile({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 28%', minWidth: 96, borderRadius: '16px' }}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: "text.secondary",
            fontWeight: 700
          }}>
          {label}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.25, fontWeight: 700 }} noWrap>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
