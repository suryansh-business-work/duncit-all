import type { ReactNode } from 'react';
import { Box, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';

interface Props {
  title: ReactNode;
  /** One line under the title saying what is being compared. */
  caption?: string;
  /** Plot height in px. Left out, the body takes its content's height (a list). */
  height?: number;
  /** False when every value is zero — the empty text shows instead of the chart. */
  hasData: boolean;
  loading: boolean;
  emptyText: string;
  /** The chart itself, rendered only when there is data. */
  children: ReactNode;
}

/** The tooltip every Loyalty chart draws: the paper surface, the theme's text and divider. */
export const chartTooltip = (theme: Theme) => ({
  backgroundColor: theme.palette.background.paper,
  titleColor: theme.palette.text.primary,
  bodyColor: theme.palette.text.primary,
  borderColor: theme.palette.divider,
  borderWidth: 1,
});

/**
 * The card around every Loyalty dashboard chart: its title and caption, and
 * the loading and empty states, so every chart and ranking reads as one set.
 */
export default function ChartCard({ title, caption, height, hasData, loading, emptyText, children }: Readonly<Props>) {
  // Computed above the JSX so the empty state never nests a ternary.
  let fallback = <Typography sx={{ color: 'text.secondary', pt: 4 }}>{emptyText}</Typography>;
  if (loading) fallback = <CircularProgress sx={{ mt: 4 }} />;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        {caption && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {caption}
          </Typography>
        )}
        <Box sx={{ height, mt: 2 }}>{hasData ? children : fallback}</Box>
      </CardContent>
    </Card>
  );
}
